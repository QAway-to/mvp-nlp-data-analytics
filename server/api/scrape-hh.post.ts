import type { Lead } from '~/types'

const QUERY_MAX = 100
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = 'openai/gpt-oss-120b:free'

interface HHVacancy {
  id: string
  name: string
  employer: { id: string; name: string; alternate_url: string }
  alternate_url: string
  snippet: { requirement: string | null; responsibility: string | null }
  area: { name: string }
  salary: { from: number | null; to: number | null; currency: string } | null
}

function stripTags(s: string | null | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

function buildDescription(v: HHVacancy): string {
  const parts: string[] = [`Вакансия: ${v.name}`, `Компания: ${v.employer.name}`, `Город: ${v.area.name}`]
  if (v.salary) {
    const { from, to, currency } = v.salary
    if (from || to) parts.push(`Зарплата: ${[from && `от ${from}`, to && `до ${to}`].filter(Boolean).join(' ')} ${currency}`)
  }
  if (v.snippet.requirement) parts.push(`Требования: ${stripTags(v.snippet.requirement)}`)
  if (v.snippet.responsibility) parts.push(`Обязанности: ${stripTags(v.snippet.responsibility)}`)
  return parts.join('\n')
}

export default defineEventHandler(async (event) => {
  const { query } = await readBody(event)
  if (!query || typeof query !== 'string') throw createError({ statusCode: 400, message: 'Query required' })

  const q = query.trim().slice(0, QUERY_MAX)
  if (!q) throw createError({ statusCode: 400, message: 'Query cannot be empty' })

  const apiUrl = `https://api.hh.ru/vacancies?text=${encodeURIComponent(q)}&area=113&per_page=50&order_by=relevance`
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'LeadGeneratorApp/1.0', 'HH-User-Agent': 'LeadGeneratorApp/1.0' }
  }).catch(() => null)

  if (!res || !res.ok) throw createError({ statusCode: 502, message: `hh.ru API error: ${res?.status ?? 'network error'}` })

  const data = await res.json() as { items: HHVacancy[]; found: number }
  const items: HHVacancy[] = data?.items ?? []

  const seenEmployers = new Set<string>()
  const unique = items.filter(v => {
    if (seenEmployers.has(v.employer.id)) return false
    seenEmployers.add(v.employer.id)
    return true
  })

  const leads: Lead[] = unique.map(v => ({
    id: crypto.randomUUID(),
    sourceChannel: q,
    sourceType: 'hh' as const,
    name: null,
    email: null,
    phone: null,
    username: null,
    company: v.employer.name,
    intent: 'medium' as const,
    score: 55,
    status: 'new' as const,
    rawMessage: buildDescription(v),
    messageUrl: v.employer.alternate_url,
    createdAt: new Date().toISOString(),
  }))

  return { leads, messagesScanned: items.length }
})