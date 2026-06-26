import { getSchedule } from '~/server/db/repositories/outreach.repo'

export default defineEventHandler(async () => {
  const settings = await getSchedule()
  return { success: true, data: settings, error: null }
})
