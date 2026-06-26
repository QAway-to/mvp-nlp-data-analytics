import { getSchedule, getDuePlacements } from '~/server/db/repositories/outreach.repo'

// Placements whose slot has arrived — what the operator should send right now.
// Returns empty while the campaign is paused (enabled = false).
export default defineEventHandler(async () => {
  const schedule = await getSchedule()
  if (!schedule.enabled) return { success: true, data: [], paused: true, error: null }

  const due = await getDuePlacements(new Date().toISOString(), 10)
  return { success: true, data: due, paused: false, error: null }
})
