import type { Lead } from '~/types'

// We Work Remotely RSS firehose — company hiring = B2B lead. Direct mapping, no NLP.
// RSS has no search param, so we fetch all items and filter locally by query.

const QUERY_MAX = 100
const WWR_RSS = 'https://weworkremotely.com/remote-jobs.rss'

// Compiled once per tag name — avoids reallocating a RegExp on every field of every item.
const TAG_PATTERNS: Record<string, RegExp> = {}
function tag(block: string, name: string): string {
  const re = (TAG_PATTERNS[name] ??= new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  const m = block.match(re)
  return m ? m[1].trim() : ''
}

// RSS <description> is XML-escaped HTML — unescape entities to real HTML, then strip tags.
function cleanRss(s: string): string {
  const html = stripCdata(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&') // decode &amp; last
  return stripHtml(html)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const q = (typeof body?.query === 'string' ? body.query : '').trim().slice(0, QUERY_MAX).toLowerCase()

  const res = await fetch(WWR_RSS, { headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!res || !res.ok) {
    const blocked = res?.status === 403 || res?.status === 429
    throw createError({ statusCode: 502, message: blocked ? 'We Work Remotely blocked this request (datacenter IP?)' : `We Work Remotely RSS error: ${res?.status ?? 'network error'}` })
  }

  const xml = await res.text()
  if (!xml.includes('<item>')) throw createError({ statusCode: 502, message: 'Unexpected We Work Remotely RSS response' })

  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])

  const items = blocks.map(b => {
    const rawTitle = cleanRss(tag(b, 'title'))
    // WWR puts company before the first colon: "Company: Role".
    const colon = rawTitle.indexOf(':')
    const company = colon > 0 ? rawTitle.slice(0, colon).trim() : null
    return {
      title: rawTitle,
      company,
      region: cleanRss(tag(b, 'region')),
      skills: cleanRss(tag(b, 'skills')),
      category: cleanRss(tag(b, 'category')),
      type: cleanRss(tag(b, 'type')),
      description: cleanRss(tag(b, 'description')).slice(0, 600),
      link: tag(b, 'link'),
    }
  })

  const matched = q
    ? items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.skills.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q))
    : items

  const leads: Lead[] = matched.map(i => {
    const parts = [`Position: ${i.title}`]
    if (i.region) parts.push(`Region: ${i.region}`)
    if (i.skills) parts.push(`Skills: ${i.skills}`)
    if (i.category) parts.push(`Category: ${i.category}`)
    if (i.type) parts.push(`Type: ${i.type}`)
    if (i.description) parts.push(i.description)
    return {
      id: crypto.randomUUID(),
      sourceChannel: q || 'all',
      sourceType: 'wwr' as const,
      name: null,
      email: null,
      phone: null,
      username: null,
      company: i.company,
      intent: 'medium' as const,
      score: 55,
      status: 'new' as const,
      rawMessage: parts.join('\n'),
      messageUrl: i.link || null,
      createdAt: new Date().toISOString(),
    }
  })

  return { leads, messagesScanned: blocks.length }
})
