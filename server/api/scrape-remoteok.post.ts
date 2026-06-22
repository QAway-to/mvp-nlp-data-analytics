import type { Lead } from '~/types'

// RemoteOK job board — company hiring = B2B lead. Direct field mapping, no NLP.
// The public /api feed has no server-side search, so we fetch all and filter locally.

const QUERY_MAX = 100

interface RemoteOKJob {
  id?: string | number
  position?: string
  company?: string
  description?: string
  location?: string
  tags?: string[]
  url?: string
  apply_url?: string
  salary_min?: number
  salary_max?: number
}

function buildDescription(j: RemoteOKJob): string {
  const parts: string[] = [`Position: ${j.position ?? '—'}`, `Company: ${j.company ?? '—'}`]
  if (j.location) parts.push(`Location: ${j.location}`)
  if (j.salary_min || j.salary_max) parts.push(`Salary: ${[j.salary_min, j.salary_max].filter(Boolean).join('–')}`)
  if (j.tags?.length) parts.push(`Tags: ${j.tags.join(', ')}`)
  if (j.description) parts.push(stripHtml(j.description).slice(0, 600))
  return parts.join('\n')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const q = (typeof body?.query === 'string' ? body.query : '').trim().slice(0, QUERY_MAX).toLowerCase()

  const res = await fetch('https://remoteok.com/api', { headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!res || !res.ok) {
    const blocked = res?.status === 403 || res?.status === 429
    throw createError({ statusCode: 502, message: blocked ? 'RemoteOK blocked this request (datacenter IP?)' : `RemoteOK API error: ${res?.status ?? 'network error'}` })
  }

  let raw: unknown
  try { raw = await res.json() } catch { throw createError({ statusCode: 502, message: 'Invalid JSON from RemoteOK' }) }
  if (!Array.isArray(raw)) throw createError({ statusCode: 502, message: 'Unexpected RemoteOK response shape' })

  // Index 0 is a legal/metadata object — skip it.
  const items = (raw.slice(1) as RemoteOKJob[])

  const matched = q
    ? items.filter(j =>
        (j.position ?? '').toLowerCase().includes(q) ||
        (j.company ?? '').toLowerCase().includes(q) ||
        (j.description ?? '').toLowerCase().includes(q) ||
        (j.tags ?? []).some(t => t.toLowerCase().includes(q)))
    : items

  const leads: Lead[] = matched.map(j => ({
    id: crypto.randomUUID(),
    sourceChannel: q || 'all',
    sourceType: 'remoteok' as const,
    name: null,
    email: null,
    phone: null,
    username: null,
    company: j.company ?? null,
    intent: 'medium' as const,
    score: 55,
    status: 'new' as const,
    rawMessage: buildDescription(j),
    messageUrl: j.url ?? j.apply_url ?? null,
    createdAt: new Date().toISOString(),
  }))

  return { leads, messagesScanned: items.length }
})
