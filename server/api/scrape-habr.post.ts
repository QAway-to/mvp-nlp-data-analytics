import type { Lead } from '~/types'

const QUERY_MAX = 100
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = 'openai/gpt-oss-120b:free'

function parseArticles(html: string): { text: string; url: string | null }[] {
  const out: { text: string; url: string | null }[] = []

  const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/g
  const articles = [...html.matchAll(articleRe)]

  for (const article of articles.slice(0, 30)) {
    const content = article[1]

    const titleMatch = content.match(/href="(\/ru\/[^"]+\/[^"]+\/)"[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/)
      || content.match(/href="(\/ru\/[^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/)

    const leadMatch = content.match(/class="[^"]*article-snippet__lead[^"]*"[^>]*>([\s\S]*?)<\/div>/)
      || content.match(/class="[^"]*tm-article-snippet__lead[^"]*"[^>]*>([\s\S]*?)<\/div>/)

    const authorMatch = content.match(/class="[^"]*user-info__username[^"]*"[^>]*>([\s\S]*?)<\/span>/)
      || content.match(/class="[^"]*tm-user-info[^"]*"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)

    const hubMatch = content.match(/class="[^"]*hubs[^"]*"[^>]*>([\s\S]*?)<\/div>/)

    const title = (titleMatch?.[2] ?? '').replace(/<[^>]+>/g, '').trim()
    if (!title) continue

    const lead = (leadMatch?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim()
    const author = (authorMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim()
    const hubs = (hubMatch?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ', ').trim()

    const parts = [title]
    if (lead) parts.push(lead)
    if (hubs) parts.push(`Темы: ${hubs}`)
    if (author) parts.push(`Автор: ${author}`)

    const url = titleMatch?.[1] ? `https://habr.com${titleMatch[1]}` : null
    out.push({ text: parts.join('\n'), url })
  }

  return out
}

async function extractLeadsViaNLP(messages: { text: string; url: string | null }[], apiKey: string): Promise<any[]> {
  const prompt = `These are tech article snippets from Habr.com (Russian IT community).
Extract potential B2B leads — companies or professionals who might need IT/development services.
Return ONLY a valid JSON array. Each object:
  messageIndex (number), name (string|null), email (string|null),
  phone (string|null), username (string|null), company (string|null),
  intent ("high"|"medium"|"low"|"none")

intent: high=company with clear tech needs/budget, medium=startup that might outsource, low=individual dev, none=no lead signal
Return [] if no leads. Only JSON array, no markdown.

Articles:
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
  if (lead.intent === 'high') s += 30
  else if (lead.intent === 'medium') s += 15
  if (lead.company) s += 20
  if (lead.name) s += 10
  return Math.min(s, 100)
}

export default defineEventHandler(async (event) => {
  const { query } = await readBody(event)
  if (!query || typeof query !== 'string') throw createError({ statusCode: 400, message: 'Query required' })

  const q = query.trim().slice(0, QUERY_MAX)
  const url = `https://habr.com/ru/search/?q=${encodeURIComponent(q)}&target_type=posts&order=relevance`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    }
  }).catch(() => null)

  if (!res || !res.ok) throw createError({ statusCode: 502, message: `Habr.com unavailable: ${res?.status ?? 'network error'}` })

  const html = await res.text()
  const messages = parseArticles(html)
  if (!messages.length) return { leads: [], messagesScanned: 0 }

  const config = useRuntimeConfig()
  const apiKey = (config.openrouterApiKey || process.env.OPENROUTER_API_KEY) as string
  if (!apiKey) throw createError({ statusCode: 500, message: 'OPENROUTER_API_KEY not configured' })

  let extracted: any[] = []
  try {
    extracted = await extractLeadsViaNLP(messages, apiKey)
  } catch (e: any) {
    console.error('[scrape-habr] NLP error:', e?.message)
  }

  const leads: Lead[] = extracted
    .filter(e => typeof e?.messageIndex === 'number' && messages[e.messageIndex])
    .map(e => ({
      id: crypto.randomUUID(),
      sourceChannel: q,
      sourceType: 'habr' as const,
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