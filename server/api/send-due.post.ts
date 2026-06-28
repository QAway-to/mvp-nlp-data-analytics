import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { z } from 'zod'
import { readQueue, batchWrite, cellRange, COL, type CellUpdate } from '~/server/utils/sheets'
import { generateMessage } from '~/server/utils/genMessage'

// Send ONE due placement per call: pick the most-overdue scheduled row, join the
// group if needed, post a fresh message, capture the t.me/<chat>/<id> link, mark it.
// Called every few minutes by the GitHub Actions heartbeat across the send window —
// one send per tick keeps it human-paced and within the free-tier request budget.
//
// dryRun=true → report which row WOULD be sent, without joining/posting.

const bodySchema = z.object({ dryRun: z.boolean().optional() })
const DONE = ['размещено', 'проверено', 'удалено', 'пропущено', 'skip']

export default defineEventHandler(async (event) => {
  const apiId = Number(process.env.API_ID_TELEGRAM || process.env.API_ID)
  const apiHash = process.env.API_HASH
  const session = process.env.TG_SESSION
  if (!apiId || !apiHash) throw createError({ statusCode: 500, message: 'API_ID_TELEGRAM / API_HASH not set' })
  if (!session) throw createError({ statusCode: 500, message: 'TG_SESSION not set' })

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  const dryRun = parsed.success ? parsed.data.dryRun ?? false : false

  const now = Date.now()
  const rows = await readQueue()
  const due = rows
    .filter((r) =>
      r.status.toLowerCase() === 'запланировано' &&
      r.slot && Date.parse(r.slot) <= now &&
      !r.messageUrl && !DONE.includes(r.status.toLowerCase()))
    .sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot))

  if (due.length === 0) return { success: true, sent: 0, note: 'нет созревших слотов' }
  const target = due[0]

  if (dryRun) {
    return { success: true, dryRun: true, would_send: `@${target.handle}`, slot: target.slot, due_count: due.length }
  }

  // Mark a row 'пропущено' + reason so a failing target never blocks the queue
  // (it's the most-overdue, so it'd be re-picked every tick otherwise).
  const markSkipped = (reason: string) =>
    batchWrite([{ range: `${cellRange(COL.status, target.row)}`, values: [['пропущено']] },
                { range: `${cellRange(COL.reason, target.row)}`, values: [[`[auto] ${reason}`.slice(0, 120)]] }])

  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 })
  try {
    await client.connect()
    const entity = await client.getEntity(target.handle)

    // Join the group first — you can only post as a member.
    if (entity instanceof Api.Channel && entity.left !== false) {
      try { await client.invoke(new Api.channels.JoinChannel({ channel: entity })) }
      catch (e) {
        const m = String((e as Error)?.message || '')
        if (/FLOOD_WAIT/i.test(m)) return { success: false, sent: 0, skipped: `@${target.handle}`, reason: 'flood — retry later' }
        if (!/ALREADY_PARTICIPANT/i.test(m)) {
          await markSkipped(`join: ${m.slice(0, 50)}`).catch(() => {})
          return { success: false, sent: 0, skipped: `@${target.handle}`, reason: `join: ${m.slice(0, 60)}` }
        }
      }
    }

    const { text, source } = await generateMessage()
    let msg
    try {
      msg = await client.sendMessage(entity, { message: text })
    } catch (e) {
      const m = String((e as Error)?.message || '')
      if (/FLOOD_WAIT/i.test(m)) return { success: false, sent: 0, skipped: `@${target.handle}`, reason: 'flood — retry later' }
      await markSkipped(`send: ${m.slice(0, 50)}`).catch(() => {})
      return { success: false, sent: 0, skipped: `@${target.handle}`, reason: `send: ${m.slice(0, 60)}` }
    }
    const link = `https://t.me/${target.handle}/${msg.id}`

    const updates: CellUpdate[] = [
      { range: cellRange(COL.status, target.row), values: [['размещено']] },
      { range: cellRange(COL.messageUrl, target.row), values: [[link]] },
      { range: cellRange(COL.postedDate, target.row), values: [[new Date().toISOString()]] },
      { range: cellRange(COL.variant, target.row), values: [[`auto:${source}`]] },
    ]
    await batchWrite(updates)

    return { success: true, sent: 1, handle: `@${target.handle}`, link, source, remaining_due: due.length - 1 }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, message: `send failed for @${target.handle}: ${detail}` })
  } finally {
    await client.disconnect().catch(() => {})
  }
})
