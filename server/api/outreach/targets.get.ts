import { readQueue } from '~/server/utils/sheets'

// The full operator queue — read straight from the Google Sheet (the database).
export default defineEventHandler(async () => {
  const rows = await readQueue()
  return { success: true, data: rows, error: null }
})
