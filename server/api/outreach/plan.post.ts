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
})

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

  const slots = generateSlots(cfg, eligible.length)
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
