import { readQueue } from '~/server/utils/sheets'

// Rows whose scheduled slot has arrived — what the operator should send now.
export default defineEventHandler(async () => {
  const rows = await readQueue()
  const now = Date.now()
  const due = rows
    .filter((r) => r.status.toLowerCase() === 'запланировано' && r.slot && Date.parse(r.slot) <= now)
    .sort((a, b) => Date.parse(a.slot) - Date.parse(b.slot))
    .slice(0, 10)
  return { success: true, data: due, error: null }
})
