import { z } from 'zod'
import { getSchedule, updateSchedule } from '~/server/db/repositories/outreach.repo'

// Update pace settings and/or start/pause the campaign (enabled flag).
const bodySchema = z.object({
  perDay: z.number().int().min(1).max(200).optional(),
  activeStartHour: z.number().int().min(0).max(23).optional(),
  activeEndHour: z.number().int().min(1).max(24).optional(),
  minGapMin: z.number().int().min(1).max(720).optional(),
  jitterMin: z.number().int().min(0).max(120).optional(),
  tzOffsetHours: z.number().int().min(-12).max(14).optional(),
  enabled: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid body' })

  // Validate the MERGED result (a partial update of one hour must stay coherent
  // against the other hour already stored).
  const current = await getSchedule()
  const merged = { ...current, ...parsed.data }
  if (merged.activeEndHour <= merged.activeStartHour) {
    throw createError({ statusCode: 400, message: 'Часы «по» должны быть больше часов «с»' })
  }

  const settings = await updateSchedule(parsed.data)
  return { success: true, data: settings, error: null }
})
