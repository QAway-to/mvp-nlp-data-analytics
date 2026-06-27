import { getScheduleConfig } from '~/server/outreach/config'

// Current pace defaults (from env) — used to seed the UI schedule form.
export default defineEventHandler(() => {
  return { success: true, data: getScheduleConfig(), error: null }
})
