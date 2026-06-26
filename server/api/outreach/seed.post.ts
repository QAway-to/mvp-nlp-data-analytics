import { seedTargets } from '~/server/db/repositories/outreach.repo'

// Idempotently load the 50 benzinradar placement targets into the DB.
export default defineEventHandler(async () => {
  const result = await seedTargets()
  return { success: true, ...result }
})
