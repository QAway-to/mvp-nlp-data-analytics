import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Lead } from '~/types'

const CHANNEL_RE = /^[a-zA-Z0-9_]{1,32}$/

function scoreLocally(lead: Partial<Lead>): number {
  let s = 0
  if (lead.email || lead.phone || lead.username) s += 40
  if (lead.intent === 'high') s += 35
  else if (lead.intent === 'medium') s += 18
  if (lead.company) s += 15
  if (lead.name) s += 10
  return Math.min(s, 100)
}

function parseMessages(html: string): { text: string; url: string | null }[] {
  const out: { text: string; url: string | null }[] = []

  const textRe = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  const urlRe = /class="tgme_widget_message_date"[^>]*href="([^"]+)"/g

  const texts = [...html.matchAll(textRe)].map(m =>
    m[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .trim()
  ).filter(t => t.length > 15)

  const urls = [...html.matchAll(urlRe)].map(m => m[1])

  if (!texts.length) {
    console.warn('[scrape] No messages parsed from HTML — channel may be private or empty')
  }

  texts.forEach((text, i) => out.push({ text, url: urls[i] ?? null }))
  return out.slice(0, 50)
}

export default defineEventHandler(async (event) => {
  const { channel } = await readBody(event)
  if (!channel) throw createError({ statusCode: 400, message: 'Channel name required' })

  const name = String(channel)
    .replace('@', '')
    .replace(/https?:\/\/t\.me\//g, '')
    .trim()

  if (!CHANNEL_RE.test(name)) {
    throw createError({ statusCode: 400, message: 'Invalid channel name. Use only letters, numbers, underscores (max 32 chars).' })
  }

  const res = await fetch(`https://t.me/s/${name}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  }).catch(() => null)

  if (!res || !res.ok) {
    throw createError({ statusCode: 404, message: `Channel @${name} not found or has no public messages` })
  }

  const html = await res.text()

  if (!html.includes('tgme_widget_message_bubble')) {
    throw createError({ statusCode: 404, message: `@${name} appears to be private or has no public messages` })
  }

  const messages = parseMessages(html)
  if (!messages.length) return { leads: [], messagesScanned: 0 }

  const config = useRuntimeConfig()
  const apiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY) as string
  if (!apiKey) throw createError({ statusCode: 500, message: 'GEMINI_API_KEY not configured' })

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' } as any
  })

  const prompt = `Extract potential sales leads from these Telegram channel messages.
Return ONLY a valid JSON array. Each object must have:
  messageIndex (number), name (string|null), email (string|null), phone (string|null),
  username (string|null, Telegram @handle if mentioned), company (string|null),
  intent ("high"|"medium"|"low"|"none")

intent guide:
  high   = person explicitly searching for a product/service/contractor
  medium = mentions a pain point or need that implies they might buy
  low    = loosely related, could be a lead with outreach
  none   = no lead signal at all

If no leads found: []. Respond with ONLY the JSON array.

Messages:
${messages.map((m, i) => `[${i}] ${m.text}`).join('\n---\n')}`

  let extracted: any[] = []
  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(raw)
    extracted = Array.isArray(parsed) ? parsed : []
  } catch {
    extracted = []
  }

  const leads: Lead[] = extracted
    .filter(e => typeof e?.messageIndex === 'number' && messages[e.messageIndex])
    .map(e => {
      const partial: Omit<Lead, 'id' | 'status' | 'createdAt' | 'score'> = {
        sourceChannel: name,
        name: e.name ?? null,
        email: e.email ?? null,
        phone: e.phone ?? null,
        username: e.username ?? null,
        company: e.company ?? null,
        intent: ['high', 'medium', 'low', 'none'].includes(e.intent) ? e.intent : 'none',
        rawMessage: messages[e.messageIndex].text,
        messageUrl: messages[e.messageIndex].url,
      }
      return {
        ...partial,
        id: crypto.randomUUID(),
        score: scoreLocally(partial),
        status: 'new' as const,
        createdAt: new Date().toISOString(),
      }
    })

  return { leads, messagesScanned: messages.length }
})