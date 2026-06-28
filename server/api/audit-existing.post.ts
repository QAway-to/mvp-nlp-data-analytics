import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { z } from 'zod'
import { readQueue, batchWrite, cellRange, COL, type CellUpdate } from '~/server/utils/sheets'
import { vetChannel } from '~/server/utils/tgVet'

// Re-validate EXISTING sheet rows authoritatively via the account (catches the
// "looks ok on t.me but actually requires joining / is a channel / banned" cases
// the public check can't see). Writes verdict GO/SKIP + a "[acc]" reason marker so
// re-runs skip already-audited rows. Bounded per call (free-tier); caller loops.

const bodySchema = z.object({ maxCheck: z.number().int().min(1).max(25).optional() })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const DONE = ['проверено', 'размещено']

export default defineEventHandler(async (event) => {
  const apiId = Number(process.env.API_ID_TELEGRAM || process.env.API_ID)
  const apiHash = process.env.API_HASH
  const session = process.env.TG_SESSION
  if (!apiId || !apiHash) throw createError({ statusCode: 500, message: 'API_ID_TELEGRAM / API_HASH not set' })
  if (!session) throw createError({ statusCode: 500, message: 'TG_SESSION not set' })

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  const maxCheck = (parsed.success && parsed.data.maxCheck) || 15

  const rows = await readQueue()
  // not posted, not yet account-audited
  const pending = rows.filter((r) =>
    !r.messageUrl && !DONE.includes(r.status.toLowerCase()) && !r.reason.startsWith('[acc]'))
  const batch = pending.slice(0, maxCheck)

  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 })
  const updates: CellUpdate[] = []
  let go = 0, skip = 0
  try {
    await client.connect()
    for (const r of batch) {
      let verdict = 'SKIP', reason = '[acc] не найден/закрыт'
      try {
        const ent = await client.getEntity(r.handle)
        if (ent instanceof Api.Channel) {
          const full = await client.invoke(new Api.channels.GetFullChannel({ channel: ent }))
          const vet = vetChannel(ent, full.fullChat as Api.ChannelFull)
          verdict = vet.ok ? 'GO' : 'SKIP'
          reason = '[acc] ' + (vet.ok ? `постируемая группа (${vet.members})` : vet.reasons.join(', '))
        } else if (ent instanceof Api.Chat) {
          // basic (legacy) group — members can post by default
          if (ent.deactivated) { verdict = 'SKIP'; reason = '[acc] группа удалена' }
          else { verdict = 'GO'; reason = `[acc] базовая группа (${Number(ent.participantsCount ?? 0)})` }
        } else {
          verdict = 'SKIP'; reason = '[acc] не группа (канал/юзер)'
        }
      } catch (e) {
        const m = String((e as Error)?.message || '')
        reason = /FLOOD_WAIT/.test(m) ? '[acc] flood, повтори' : '[acc] не найден/закрыт'
      }
      updates.push({ range: `${cellRange(COL.verdict, r.row)}:${cellRange(COL.reason, r.row)}`, values: [[verdict, reason]] })
      verdict === 'GO' ? go++ : skip++
      await sleep(900)
    }
    await batchWrite(updates)
    return { success: true, checked: batch.length, go, skip, remaining: Math.max(0, pending.length - batch.length) }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, message: `audit failed: ${detail}` })
  } finally {
    await client.disconnect().catch(() => {})
  }
})
