import type { Lead } from '~/types'

const QUERY_MAX = 100
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = 'openai/gpt-oss-120b:free'

function parseProjects(html: string): { text: string; url: string | null }[] {
  const out: { text: string; url: string | null }[] = []

  const titleRe = /class="[^"]*b-post__title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
  const descRe = /class="[^"]*b-post__text[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  const titles = [...html.matchAll(titleRe)]
  const descs = [...html.matchAll(descRe)]

  if (titles.length > 0) {
    titles.slice(0, 30).forEach((m, i) => {
      const title = m[2].replace(/<[^>]+>/g, '').trim()
      const desc = descs[i]?.[1]?.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim() ?? ''
      const text = desc ? `${title}\n${desc}` : title
      if (text.length > 10) out.push({ text, url: m[1].startsWith('http') ? m[1] : `https://www.fl.ru${m[1]}` })
    })
    return out
  }

  const altRe = /href="(\/projects\/view\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const altMatches = [...html.matchAll(altRe)]
  altMatches.slice(0, 30).forEach(m => {
    const text = m[2].replace(/<[^>]+>/g, '').trim()
    if (text.length > 10) out.push({ text, url: `https://www.fl.ru${m[1]}` })
  })

  return out
}

async function extractLeadsViaNLP(messages: { text: string; url: string | null }[], apiKey: string): Promise<any[]> {
  const prompt = `These are freelance project postings from fl.ru (Russian freelance platform).
Extract B2B leads — clients who need IT/web/app development services.
Return ONLY a valid JSON array. Each object:
  messageIndex (number), name (string|null), email (string|null),
  phone (string|null), username (string|null), company (string|null),
  intent ("high"|"medium"|"low"|"none")

intent: high=clear dev request with budget, medium=dev request without budget, low=tech-adjacent, none=no fit
Return [] if no leads. Only JSON array, no markdown.

Postings:
${messages.map((m, i) => `[${i}] ${m.text}`).join('\n---\n')}`

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)

  const data = await res.json() as any
  const content: string = data?.choices?.[0]?.message?.content ?? '[]'
  try {
    const parsed = JSON.parse(content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed?.leads)) return parsed.leads
    if (Array.isArray(parsed?.data)) return parsed.data
    return []
  } catch {
    const match = content.match(/\[[\s\S]*\]/)
    if (match) { try { return JSON.parse(match[0]) } catch { return [] } }
    return []
  }
}

function scoreLocally(lead: any): number {
  let s = 20
  if (lead.email || lead.phone || lead.username) s += 40
  if (lead.intent === 'high') s += 35
  else if (lead.intent === 'medium') s += 18
  if (lead.company) s += 15
  if (lead.name) s += 10
  return Math.min(s, 100)
}

export default defineEventHandler(async (event) => {
  const { query } = await readBody(event)
  if (!query || typeof query !== 'string') throw createError({ statusCode: 400, message: 'Query required' })

  const q = query.trim().slice(0, QUERY_MAX)
  const url = `https://www.fl.ru/projects/?search=${encodeURIComponent(q)}&type=2`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  }).catch(() => null)

  if (!res || !res.ok) throw createError({ statusCode: 502, message: `fl.ru unavailable: ${res?.status ?? 'network error'}` })

  const html = await res.text()
  const messages = parseProjects(html)
  if (!messages.length) return { leads: [], messagesScanned: 0 }

  const config = useRuntimeConfig()
  const apiKey = (config.openrouterApiKey || process.env.OPENROUTER_API_KEY) as string
  if (!apiKey) throw createError({ statusCode: 500, message: 'OPENROUTER_API_KEY not configured' })

  let extracted: any[] = []
  try {
    extracted = await extractLeadsViaNLP(messages, apiKey)
  } catch (e: any) {
    console.error('[scrape-fl] NLP error:', e?.message)
  }

  const leads: Lead[] = extracted
    .filter(e => typeof e?.messageIndex === 'number' && messages[e.messageIndex])
    .map(e => ({
      id: crypto.randomUUID(),
      sourceChannel: q,
      sourceType: 'fl' as const,
      name: e.name ?? null,
      email: e.email ?? null,
      phone: e.phone ?? null,
      username: e.username ?? null,
      company: e.company ?? null,
      intent: ['high', 'medium', 'low', 'none'].includes(e.intent) ? e.intent : 'none',
      score: scoreLocally(e),
      status: 'new' as const,
      rawMessage: messages[e.messageIndex].text,
      messageUrl: messages[e.messageIndex].url,
      createdAt: new Date().toISOString(),
    }))

  return { leads, messagesScanned: messages.length }
})