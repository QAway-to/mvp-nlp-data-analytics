import { generateSlots, type ScheduleConfig } from '~/server/outreach/schedule'
import { MESSAGE_VARIANTS } from '~/server/outreach/targets.seed'
import {
  getSchedule, listSchedulableTargetIds, upsertPlacement,
} from '~/server/db/repositories/outreach.repo'

// Build a human-paced send plan: schedule every eligible (go/caution, not yet
// sent) target into time slots and assign a rotating message variant — so no
// community gets a duplicate text and the cadence looks organic.
export default defineEventHandler(async () => {
  const s = await getSchedule()
  const targetIds = await listSchedulableTargetIds()
  if (targetIds.length === 0) return { success: true, planned: 0, note: 'нет площадок со статусом go/caution — сначала «Проверить площадки»' }

  const cfg: ScheduleConfig = {
    perDay: s.perDay,
    activeStartHour: s.activeStartHour,
    activeEndHour: s.activeEndHour,
    minGapMin: s.minGapMin,
    jitterMin: s.jitterMin,
    tzOffsetHours: s.tzOffsetHours,
  }
  const slots = generateSlots(cfg, targetIds.length)

  const written: string[] = []
  for (let i = 0; i < targetIds.length; i++) {
    const variant = (i % MESSAGE_VARIANTS.length) + 1
    const ok = await upsertPlacement(targetIds[i], variant, MESSAGE_VARIANTS[variant - 1], slots[i])
    if (ok) written.push(slots[i]) // slots are ascending, so written stays ascending
  }

  return { success: true, planned: written.length, firstAt: written[0] ?? null, lastAt: written[written.length - 1] ?? null }
})
