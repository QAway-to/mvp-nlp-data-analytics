import type { Lead } from '~/types'

// Shared lead helpers used by the NLP-based scrapers (Telegram, Hacker News).
// Auto-imported by Nitro into server routes.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = 'openai/gpt-oss-120b:free'
const OPENROUTER_TIMEOUT_MS = 30_000

// Shape the model is asked to return per message. Untrusted — callers still guard at runtime.
export interface ExtractedLead {
  messageIndex: number
  name: string | null
  email: string | null
  phone: string | null
  username: string | null
  company: string | null
  intent: string
}

// Browser-like UA — some sources (RemoteOK, WWR) block bare/datacenter agents.
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export function scoreLocally(lead: Partial<Lead>): number {
  let s = 0
  if (lead.email || lead.phone || lead.username) s += 40
  if (lead.intent === 'high') s += 35
  else if (lead.intent === 'medium') s += 18
  if (lead.company) s += 15
  if (lead.name) s += 10
  return Math.min(s, 100)
}

// Strip HTML tags and decode the handful of entities the sources actually emit.
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

// Strip a leading/trailing CDATA wrapper (used in RSS descriptions).
export function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()
}

// Ask OpenRouter to pull structured leads out of freeform messages.
// Returns a raw array of extracted objects (messageIndex + fields); never throws on bad output.
export async function extractLeadsViaOpenRouter(
  messages: { text: string; url: string | null }[],
  apiKey: string,
): Promise<ExtractedLead[]> {
  const prompt = `Extract potential sales leads from these messages (people/companies looking to hire a freelancer or buy a service).
Return ONLY a valid JSON array. Each object must have:
  messageIndex (number), name (string|null), email (string|null), phone (string|null),
  username (string|null), company (string|null),
  intent ("high"|"medium"|"low"|"none")

intent guide:
  high   = person explicitly searching for a product/service/contractor
  medium = mentions a pain point or need that implies they might buy
  low    = loosely related, could be a lead with outreach
  none   = no lead signal at all

If no leads found return []. Respond with ONLY the JSON array, no markdown, no explanation.

Messages:
${messages.map((m, i) => `[${i}] ${m.text}`).join('\n---\n')}`

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter API error ${res.status}: ${err.slice(0, 200)}`)
  }
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
