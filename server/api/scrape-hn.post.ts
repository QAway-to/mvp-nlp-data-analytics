import type { Lead } from '~/types'

// Hacker News "Ask HN: Freelancer? Seeking freelancer?" monthly thread.
// Two-step: find the latest matching thread, then read its comments and keep
// the "SEEKING FREELANCER" ones (clients hiring contractors = real leads).

const ALGOLIA_SEARCH = 'https://hn.algolia.com/api/v1/search_by_date'
const ALGOLIA_ITEM = 'https://hn.algolia.com/api/v1/items'
const DEFAULT_QUERY = 'Freelancer Seeking freelancer'
const QUERY_MAX = 200
const MAX_COMMENTS = 50
const MAX_NODES = 2000
const MAX_DEPTH = 30
const COMMENT_TEXT_MAX = 800
const FETCH_TIMEOUT_MS = 10_000

interface AlgoliaHit { objectID: string; title: string | null; created_at_i: number }
interface AlgoliaNode { id: number; text: string | null; children?: AlgoliaNode[] }

// Depth-first flatten of every node that carries text. Bounded on depth and total nodes
// so a pathologically large/deep thread tree can't overflow the stack or balloon memory.
function flattenComments(node: AlgoliaNode, out: { id: number; text: string }[], depth = 0): void {
  if (depth > MAX_DEPTH || out.length >= MAX_NODES) return
  for (const child of node.children ?? []) {
    if (out.length >= MAX_NODES) return
    if (child.text) out.push({ id: child.id, text: child.text })
    flattenComments(child, out, depth + 1)
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const q = (typeof body?.query === 'string' ? body.query.trim().slice(0, QUERY_MAX) : '') || DEFAULT_QUERY

  // Step 1 — find the latest thread whose title looks like the freelancer thread.
  const searchRes = await fetch(`${ALGOLIA_SEARCH}?tags=ask_hn&query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null)
  if (!searchRes || !searchRes.ok) {
    throw createError({ statusCode: 502, message: `Hacker News search error: ${searchRes?.status ?? 'network error'}` })
  }
  const searchData = await searchRes.json() as { hits?: AlgoliaHit[] }
  const hits = searchData?.hits ?? []
  const threads = hits.filter(h => h.title && /seeking freelancer/i.test(h.title))
  if (!threads.length) return { leads: [], messagesScanned: 0 }

  const thread = threads.reduce((latest, h) => (h.created_at_i > latest.created_at_i ? h : latest))

  // Step 2 — fetch the thread tree and keep "SEEKING FREELANCER" comments.
  const itemRes = await fetch(`${ALGOLIA_ITEM}/${thread.objectID}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null)
  if (!itemRes || !itemRes.ok) {
    throw createError({ statusCode: 502, message: `Hacker News item error: ${itemRes?.status ?? 'network error'}` })
  }
  const root = await itemRes.json() as AlgoliaNode

  const all: { id: number; text: string }[] = []
  flattenComments(root, all)

  const clientComments = all
    .map(c => ({ id: c.id, text: stripHtml(c.text) }))
    .filter(c => c.text.toUpperCase().startsWith('SEEKING FREELANCER'))
    .slice(0, MAX_COMMENTS)

  if (!clientComments.length) return { leads: [], messagesScanned: 0 }

  const apiKey = (useRuntimeConfig().openrouterApiKey || process.env.OPENROUTER_API_KEY) as string
  if (!apiKey) throw createError({ statusCode: 500, message: 'OPENROUTER_API_KEY not configured' })

  const messages = clientComments.map(c => ({
    text: c.text.slice(0, COMMENT_TEXT_MAX),
    url: `https://news.ycombinator.com/item?id=${c.id}`,
  }))

  let extracted: ExtractedLead[] = []
  try {
    extracted = await extractLeadsViaOpenRouter(messages, apiKey)
  } catch (e: any) {
    console.error('[scrape-hn] OpenRouter error:', e?.message)
    extracted = []
  }

  const leads: Lead[] = extracted
    .filter(e => typeof e?.messageIndex === 'number' && messages[e.messageIndex])
    .map(e => {
      const partial: Omit<Lead, 'id' | 'status' | 'createdAt' | 'score'> = {
        sourceChannel: q,
        sourceType: 'hn',
        name: e.name ?? null,
        email: e.email ?? null,
        phone: e.phone ?? null,
        username: e.username ?? null,
        company: e.company ?? null,
        intent: ['high', 'medium', 'low', 'none'].includes(e.intent) ? e.intent : 'none',
        rawMessage: messages[e.messageIndex].text,
        messageUrl: messages[e.messageIndex].url,
      }
      return { ...partial, id: crypto.randomUUID(), score: scoreLocally(partial), status: 'new' as const, createdAt: new Date().toISOString() }
    })

  return { leads, messagesScanned: clientComments.length }
})
