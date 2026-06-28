import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { z } from 'zod'
import { readQueue, batchWrite, cellRange, COL, type CellUpdate } from '~/server/utils/sheets'
import { generateMessage } from '~/server/utils/genMessage'
import { passAntibot } from '~/server/utils/antibot'

// ≥1s between every transition (connect→resolve→join→send): human-paced and lets
// Telegram register membership/captcha state before the next step.
const STEP = 1200
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Hard daily cap on auto attempts — each attempt joins a group, and join-burn is
// the main ban vector, so a backlog must never dump a burst. Env-overridable.
const DAILY_CAP = Number(process.env.OUTREACH_DAILY_CAP || 6)

// Start of the current MSK calendar day as a UTC epoch (for the daily count).
function mskDayStart(): number {
  const msk = new Date(Date.now() + 3 * 3_600_000)
  return Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate()) - 3 * 3_600_000
}

// First open (not closed/hidden) forum topic — forum groups reject posts to the
// closed General topic (TOPIC_CLOSED); a message must target an open topic.
async function pickForumTopic(client: TelegramClient, channel: Api.Channel): Promise<number | null> {
  try {
    const res = await client.invoke(new Api.channels.GetForumTopics({ channel: channel as unknown as Api.TypeInputChannel, limit: 50 }))
    const open = (res.topics ?? []).filter((t): t is Api.ForumTopic => t instanceof Api.ForumTopic && !t.closed && !t.hidden)
    if (!open.length) return null
    const pref = open.find((t) => /общ|general|чат|болтал|флуд|основн|свобод/i.test(t.title ?? ''))
    return (pref ?? open[0]).id
  } catch { return null }
}

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

  // Account-safety: stop once today's auto attempts (joins) hit the cap.
  const dayStart = mskDayStart()
  const todayAuto = rows.filter((r) => {
    const pd = Date.parse(r.postedDate)
    return !Number.isNaN(pd) && pd >= dayStart &&
      (r.status.toLowerCase() === 'размещено' || (r.reason ?? '').startsWith('[auto]'))
  }).length
  if (todayAuto >= DAILY_CAP) {
    return { success: true, sent: 0, note: `дневной лимит ${DAILY_CAP} достигнут (сегодня ${todayAuto})` }
  }

  // Mark a row 'пропущено' + reason (with a date stamp so it counts toward the daily
  // cap) so a failing target never blocks the queue — it'd be re-picked every tick.
  const markSkipped = (reason: string) =>
    batchWrite([{ range: cellRange(COL.status, target.row), values: [['пропущено']] },
                { range: cellRange(COL.reason, target.row), values: [[`[auto] ${reason}`.slice(0, 120)]] },
                { range: cellRange(COL.postedDate, target.row), values: [[new Date().toISOString()]] }])

  const isFlood = (m: string) => /FLOOD_WAIT/i.test(m)
  const isGate = (m: string) => /CHAT_WRITE_FORBIDDEN|CHAT_SEND_PLAIN_FORBIDDEN|USER_BANNED_IN_CHANNEL|CHAT_ADMIN_REQUIRED/i.test(m)

  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 })
  try {
    await client.connect()
    await sleep(STEP)
    const entity = await client.getEntity(target.handle)
    await sleep(STEP)

    // Join the group first — you can only post as a member.
    if (entity instanceof Api.Channel && entity.left !== false) {
      try { await client.invoke(new Api.channels.JoinChannel({ channel: entity })) }
      catch (e) {
        const m = String((e as Error)?.message || '')
        if (isFlood(m)) return { success: false, sent: 0, skipped: `@${target.handle}`, reason: 'flood — retry later' }
        if (!/ALREADY_PARTICIPANT/i.test(m)) {
          await markSkipped(`join: ${m.slice(0, 50)}`).catch(() => {})
          return { success: false, sent: 0, skipped: `@${target.handle}`, reason: `join: ${m.slice(0, 60)}` }
        }
      }
      await sleep(STEP + 800) // let membership register
    }

    // Forum groups reject posts to the closed General topic → target an open topic.
    let topicId: number | null = null
    if (entity instanceof Api.Channel && entity.forum) {
      topicId = await pickForumTopic(client, entity)
      await sleep(STEP)
      if (topicId == null) {
        await markSkipped('форум: нет открытых тем').catch(() => {})
        return { success: false, sent: 0, skipped: `@${target.handle}`, reason: 'форум: нет открытых тем' }
      }
    }

    const { text, source } = await generateMessage()
    await sleep(STEP)

    const trySend = () => topicId != null
      ? client.sendMessage(entity, { message: text, replyTo: topicId })
      : client.sendMessage(entity, { message: text })
    let msg
    let antibotNote = ''
    try {
      msg = await trySend()
    } catch (e) {
      const m = String((e as Error)?.message || '')
      if (isFlood(m)) return { success: false, sent: 0, skipped: `@${target.handle}`, reason: 'flood — retry later' }
      if (!isGate(m)) {
        await markSkipped(`send: ${m.slice(0, 50)}`).catch(() => {})
        return { success: false, sent: 0, skipped: `@${target.handle}`, reason: `send: ${m.slice(0, 60)}` }
      }
      // Write forbidden → likely an antibot captcha gate. Try to pass it, retry once.
      const anti = await passAntibot(client, entity)
      antibotNote = anti.note
      await sleep(STEP + 800)
      if (!anti.attempted) {
        await markSkipped(`капча/закрыто: ${anti.note}`).catch(() => {})
        return { success: false, sent: 0, skipped: `@${target.handle}`, reason: `закрыто: ${anti.note}` }
      }
      try {
        msg = await trySend()
      } catch (e2) {
        const m2 = String((e2 as Error)?.message || '')
        if (isFlood(m2)) return { success: false, sent: 0, skipped: `@${target.handle}`, reason: 'flood — retry later' }
        await markSkipped(`капча не пройдена: ${anti.note}`).catch(() => {})
        return { success: false, sent: 0, skipped: `@${target.handle}`, reason: `после антибота: ${m2.slice(0, 40)} (${anti.note})` }
      }
    }
    const link = `https://t.me/${target.handle}/${msg.id}`

    const updates: CellUpdate[] = [
      { range: cellRange(COL.status, target.row), values: [['размещено']] },
      { range: cellRange(COL.messageUrl, target.row), values: [[link]] },
      { range: cellRange(COL.postedDate, target.row), values: [[new Date().toISOString()]] },
      { range: cellRange(COL.variant, target.row), values: [[`auto:${source}`]] },
    ]
    await batchWrite(updates)

    return { success: true, sent: 1, handle: `@${target.handle}`, link, source, antibot: antibotNote || 'не требовался', remaining_due: due.length - 1 }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 502, message: `send failed for @${target.handle}: ${detail}` })
  } finally {
    await client.disconnect().catch(() => {})
  }
})
