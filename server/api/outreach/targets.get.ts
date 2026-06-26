import { listQueue } from '~/server/db/repositories/outreach.repo'

// The full operator queue: every target joined with its placement (if planned).
export default defineEventHandler(async () => {
  const rows = await listQueue()
  return { success: true, data: rows, error: null }
})
