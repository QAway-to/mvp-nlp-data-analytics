import { z } from 'zod'

// BANT extraction — intent is the PRIMARY signal. Multilingual (RU + EN).
export const BANT_SYSTEM_PROMPT = `You qualify B2B sales leads from raw online listings (Russian or English).
For each message decide whether it is a buyer expressing INTENT to hire/order a service.

type:
  "lead"    = someone wants to BUY/order a service or hire a contractor for a project (even a mere mention of an order counts)
  "vacancy" = a company hiring a full-time EMPLOYEE (job posting)
  "noise"   = a freelancer advertising themselves, off-topic, spam, or no buying signal

intent  = strength of the buying/hiring intention: "high" | "medium" | "low" | "none"
warmth  = urgency / how hot it is right now (deadline, "ASAP", "need now"): "high" | "medium" | "low" | "none"
budget  = stated budget/price as freeform text, or null
contact = a direct contact found IN THE TEXT: { "type": "telegram"|"email"|"phone"|"whatsapp"|"url", "handle": "..." } or null
verticalMatch = 0..1 relevance to the requested vertical
scamFlag = true if it looks like a scam

Return ONLY a JSON array. One object per message with this exact shape:
{ "messageIndex": number, "type": "lead"|"vacancy"|"noise", "intent": "...", "warmth": "...",
  "budget": string|null, "contact": {"type":"...","handle":"..."}|null, "verticalMatch": number, "scamFlag": boolean }
No markdown, no prose. If unsure, use "none"/"noise".`

export function buildBantUserPrompt(vertical: string, messages: { text: string }[]): string {
  return `Vertical: ${vertical}\n\nMessages:\n${messages.map((m, i) => `[${i}] ${m.text}`).join('\n---\n')}`
}

// One validated extraction row. intent/warmth reuse the shared union.
export const bantRowSchema = z.object({
  messageIndex: z.number().int().nonnegative(),
  type: z.enum(['lead', 'vacancy', 'noise']),
  intent: z.enum(['high', 'medium', 'low', 'none']),
  warmth: z.enum(['high', 'medium', 'low', 'none']).catch('none'),
  budget: z.string().nullable().catch(null),
  contact: z
    .object({
      type: z.enum(['telegram', 'email', 'phone', 'whatsapp', 'url']),
      handle: z.string().min(1),
    })
    .nullable()
    .catch(null),
  verticalMatch: z.number().min(0).max(1).catch(0),
  scamFlag: z.boolean().catch(false),
})

export type BantRow = z.infer<typeof bantRowSchema>

// Lenient parse of messy LLM output (ported from the proven OpenRouter handler):
// strip code fences, then regex-fallback to the first [...] block. Never throws.
export function parseLlmJsonArray(content: string): unknown[] {
  const cleaned = content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray((parsed as any)?.results)) return (parsed as any).results
    if (Array.isArray((parsed as any)?.leads)) return (parsed as any).leads
    if (Array.isArray((parsed as any)?.data)) return (parsed as any).data
  } catch { /* fall through */ }
  const match = content.match(/\[[\s\S]*\]/)
  if (match) {
    try { return JSON.parse(match[0]) } catch { /* ignore */ }
  }
  return []
}
