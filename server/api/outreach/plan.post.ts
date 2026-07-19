import { z } from 'zod'
import { generateSlots } from '~/server/outreach/schedule'
import { getScheduleConfig } from '~/server/outreach/config'
import { MESSAGE_VARIANTS } from '~/server/outreach/targets.seed'
import { readQueue, batchWrite, cellRange, COL, type CellUpdate } from '~/server/utils/sheets'

// Build a human-paced send plan: assign every eligible (go/caution, not yet
// posted) row a time slot + rotating message variant, written into the sheet.
const bodySchema = z.object({
  perDay: z.number().int().min(1).max(200).optional(),
  activeStartHour: z.number().int().min(0).max(23).optional(),
  activeEndHour: z.number().int().min(1).max(24).optional(),
  minGapMin: z.number().int().min(1).max(720).optional(),
  jitterMin: z.number().int().min(0).max(120).optional(),
  // Optional front-load: place `count` sends inside a tight window on the FIRST
  // active day only; every remaining row falls back to the normal pace config on
  // the following days. Lets us do a dense morning burst without re-pacing the
  // whole campaign.
  burst: z.object({
    count: z.number().int().min(1).max(200),
    activeStartHour: z.number().int().min(0).max(23),
    activeEndHour: z.number().int().min(1).max(24),
  }).refine((b) => b.activeEndHour > b.activeStartHour, {
    message: 'burst.activeEndHour должен быть больше activeStartHour',
  }).optional(),
})

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

// Start of the active window on the local day AFTER `afterUtcMs` (as UTC epoch ms),
// so the rest of the queue resumes at the next morning's window open.
function nextDayWindowStart(afterUtcMs: number, startHour: number, tzOffsetHours: number): Date {
  const local = new Date(afterUtcMs + tzOffsetHours * HOUR_MS + DAY_MS)
  local.setUTCHours(startHour, 0, 0, 0)
  return new Date(local.getTime() - tzOffsetHours * HOUR_MS)
}

// Only (re)plan rows the service owns — never overwrite a human's manual note in
// the Статус column (e.g. «мёртвая», «коммерция», «нельзя»).
const PLANNABLE = ['', 'ожидает', 'запланировано']

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  const cfg = getScheduleConfig(parsed.success ? parsed.data : {})

  const rows = await readQueue()
  const eligible = rows.filter((r) =>
    ['GO', 'CAUTION'].includes(r.verdict.toUpperCase()) &&
    PLANNABLE.includes(r.status.toLowerCase().trim()) &&
    !r.messageUrl, // already-posted rows carry a link — never re-plan them
  )
  if (eligible.length === 0) {
    return { success: true, planned: 0, note: 'нет площадок go/caution к планированию — сначала «Проверить площадки»' }
  }

  const burst = parsed.success ? parsed.data.burst : undefined
  let slots: string[]
  if (burst) {
    // Day 1: a tight window holding exactly `count` sends (capped by what's eligible).
    const day1Cfg = { ...cfg, perDay: burst.count, activeStartHour: burst.activeStartHour, activeEndHour: burst.activeEndHour }
    const day1 = generateSlots(day1Cfg, Math.min(burst.count, eligible.length))
    // Guard: the burst must stay on ONE local day. If count can't fit the window
    // (count × minGap, plus jitter, exceeds it), generateSlots silently rolls into
    // the next day — which would corrupt the rest-segment start. Fail loudly instead.
    const localDay = (iso: string) => Math.floor((Date.parse(iso) + cfg.tzOffsetHours * HOUR_MS) / DAY_MS)
    if (day1.length > 1 && localDay(day1[0]) !== localDay(day1[day1.length - 1])) {
      throw createError({
        statusCode: 400,
        message: `burst.count=${burst.count} не помещается в окно ${burst.activeStartHour}–${burst.activeEndHour} ч — уменьшите count, расширьте окно или уменьшите паузу (minGapMin=${cfg.minGapMin})`,
      })
    }
    const rest = eligible.length - day1.length
    if (rest > 0) {
      const day2From = nextDayWindowStart(Date.parse(day1[day1.length - 1]), cfg.activeStartHour, cfg.tzOffsetHours)
      slots = [...day1, ...generateSlots(cfg, rest, day2From)]
    } else {
      slots = day1
    }
  } else {
    slots = generateSlots(cfg, eligible.length)
  }
  if (slots.length < eligible.length) {
    throw createError({ statusCode: 500, message: 'Не удалось сгенерировать достаточно слотов' })
  }
  const updates: CellUpdate[] = []
  eligible.forEach((r, i) => {
    const variant = (i % MESSAGE_VARIANTS.length) + 1
    updates.push({ range: cellRange(COL.variant, r.row), values: [[`Вариант ${variant}`]] })
    updates.push({ range: cellRange(COL.slot, r.row), values: [[slots[i]]] })
    updates.push({ range: cellRange(COL.status, r.row), values: [['запланировано']] })
  })
  await batchWrite(updates)

  return { success: true, planned: eligible.length, firstAt: slots[0] ?? null, lastAt: slots[slots.length - 1] ?? null }
})
