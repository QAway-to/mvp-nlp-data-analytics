import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { z } from 'zod'
import { readQueue, appendRows, COL } from '~/server/utils/sheets'
import { vetChannel } from '~/server/utils/tgVet'

// On-demand GramJS discovery of postable, thematic GROUPS (read-only: search +
// resolve + read flags; NO join, NO post). Bounded to fit the free-tier request
// window — the caller (GitHub Actions cron) runs it on a slice of queries. Errors
// are surfaced verbatim (no masking) since this service has no log access.
//
// Env: API_ID_TELEGRAM, API_HASH, TG_SESSION. Optional CRON_SECRET → Bearer guard.

const DEFAULT_QUERIES = [
  'дальнобойщики', 'дальнобой', 'попутчики', 'грузоперевозки', 'таксисты', 'такси водители',
  'азс', 'заправки', 'бензин', 'топливо',
]

const bodySchema = z.object({
  queries: z.array(z.string().min(2).max(40)).max(30).optional(),
  maxResolve: z.number().int().min(1).max(60).optional(),
})

const MIN_MEMBERS = 300
const MAX_MEMBERS = 25_000
const RELEVANT = /такси|таксист|водител|дальнобой|фура|перевоз|попутчик|межгород|авто|азс|заправк|бензин|топлив|дорог/i
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Found { handle: string; title: string; members: number }

export default defineEventHandler(async (event) => {
  // Unauthenticated, matching the rest of the outreach API (internal app). The
  // work is read-only Telegram search, bounded per call.
  const apiId = Number(process.env.API_ID_TELEGRAM || process.env.API_ID)
  const apiHash = process.env.API_HASH
  const session = process.env.TG_SESSION
  if (!apiId || !apiHash) throw createError({ statusCode: 500, message: 'API_ID_TELEGRAM / API_HASH not set' })
  if (!session) throw createError({ statusCode: 500, message: 'TG_SESSION not set' })

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  const queries = parsed.success && parsed.data.queries?.length ? parsed.data.queries : DEFAULT_QUERIES
  const maxResolve = (parsed.success && parsed.data.maxResolve) || 25

  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 })
  try {
    await client.connect()
    const me = await client.getMe()

    // 1) candidate megagroups from search (cheap pre-filter on search-object flags)
    const seen = new Map<string, Api.Channel>()
    for (const q of queries) {
      const res = await client.invoke(new Api.contacts.Search({ q, limit: 40 })) as Api.contacts.Found
      for (const ch of res.chats) {
        if (!(ch instanceof Api.Channel)) continue
        if (ch.broadcast || !ch.megagroup || !ch.username) continue
        const u = ch.username.toLowerCase()
        if (!seen.has(u)) seen.set(u, ch)
      }
      await sleep(900)
    }

    // 2) authoritative per-chat check (permissions, size, join-mode), capped
    const good: Found[] = []
    const skipped: string[] = []
    let resolved = 0
    for (const ch of seen.values()) {
      if (resolved >= maxResolve) break
      if (ch.joinRequest || ch.defaultBannedRights?.sendMessages) { skipped.push(`@${ch.username} барьер/нельзя писать`); continue }
      resolved++
      let full
      try { full = await client.invoke(new Api.channels.GetFullChannel({ channel: ch })) }
      catch (e) { skipped.push(`@${ch.username} ${String((e as Error)?.message).slice(0, 30)}`); await sleep(600); continue }
      const fc = full.fullChat as Api.ChannelFull
      const about = (fc as { about?: string }).about ?? ''
      const vet = vetChannel(ch, fc, { min: MIN_MEMBERS, max: MAX_MEMBERS })
      const reasons = [...vet.reasons]
      if (!RELEVANT.test(ch.title + ' ' + about)) reasons.push('не релевантно')
      if (reasons.length) { skipped.push(`@${ch.username} ${reasons.join(',')}`); }
      else good.push({ handle: ch.username!, title: ch.title, members: vet.members })
      await sleep(800)
    }

    const added = await writeToSheet(good)
    return {
      success: true, connectedAs: me.username ?? String(me.id),
      candidates: seen.size, resolved, kept: good.length, added,
      keptList: good.map((g) => `@${g.handle} (${g.members})`),
      skippedSample: skipped.slice(0, 15),
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, message: `discover failed: ${detail}` })
  } finally {
    await client.disconnect().catch(() => {})
  }
})

// Append new handles to the sheet (dedup against what's already there).
async function writeToSheet(good: Found[]): Promise<number> {
  if (!good.length) return 0
  const existing = await readQueue()
  const have = new Set(existing.map((r) => r.handle.toLowerCase()))
  const fresh = good.filter((g) => !have.has(g.handle.toLowerCase()))
  if (!fresh.length) return 0
  const base = existing.length
  const rows = fresh.map((g, i) => {
    const r: (string | number)[] = new Array(17).fill('')
    r[COL.num] = base + i + 1
    r[COL.city] = 'вся РФ'
    r[COL.category] = 'discovered'
    r[COL.title] = g.title
    r[COL.chatUrl] = `https://t.me/${g.handle}`
    r[COL.members] = g.members || ''
    r[COL.status] = 'ожидает'
    r[COL.verdict] = 'GO'
    r[COL.reason] = '[acc] постируемая группа (дискавери)'
    return r
  })
  await appendRows(rows)
  return fresh.length
}
