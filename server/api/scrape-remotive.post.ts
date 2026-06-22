import type { Lead } from '~/types'

// Remotive remote-jobs API — company hiring = B2B lead. Direct field mapping, no NLP.

const QUERY_MAX = 100

interface RemotiveJob {
  id?: number
  title?: string
  company_name?: string
  description?: string
  url?: string
  tags?: string[]
  salary?: string
  candidate_required_location?: string
}

function buildDescription(j: RemotiveJob): string {
  const parts: string[] = [`Position: ${j.title ?? '—'}`, `Company: ${j.company_name ?? '—'}`]
  if (j.candidate_required_location) parts.push(`Location: ${j.candidate_required_location}`)
  if (j.salary) parts.push(`Salary: ${j.salary}`)
  if (j.tags?.length) parts.push(`Tags: ${j.tags.join(', ')}`)
  if (j.description) parts.push(stripHtml(j.description).slice(0, 600))
  return parts.join('\n')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const q = (typeof body?.query === 'string' ? body.query : '').trim().slice(0, QUERY_MAX)

  const apiUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!res || !res.ok) {
    const blocked = res?.status === 403 || res?.status === 429
    throw createError({ statusCode: 502, message: blocked ? 'Remotive blocked this request (datacenter IP?)' : `Remotive API error: ${res?.status ?? 'network error'}` })
  }

  let data: { jobs?: RemotiveJob[] }
  try { data = await res.json() as { jobs?: RemotiveJob[] } } catch { throw createError({ statusCode: 502, message: 'Invalid JSON from Remotive' }) }
  const jobs = data?.jobs ?? []

  const leads: Lead[] = jobs.map(j => ({
    id: crypto.randomUUID(),
    sourceChannel: q || 'all',
    sourceType: 'remotive' as const,
    name: null,
    email: null,
    phone: null,
    username: null,
    company: j.company_name ?? null,
    intent: 'medium' as const,
    score: 55,
    status: 'new' as const,
    rawMessage: buildDescription(j),
    messageUrl: j.url ?? null,
    createdAt: new Date().toISOString(),
  }))

  return { leads, messagesScanned: jobs.length }
})
