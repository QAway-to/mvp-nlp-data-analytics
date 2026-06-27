import { readQueue, appendRows, COL } from '~/server/utils/sheets'
import { TARGET_SEEDS } from '~/server/outreach/targets.seed'

// Populate the sheet with the seed targets — but only handles not already present
// (idempotent; never duplicates a row the operator already has).
export default defineEventHandler(async () => {
  const existing = await readQueue()
  const have = new Set(existing.map((r) => r.handle.toLowerCase()))
  const toAdd = TARGET_SEEDS.filter((t) => !have.has(t.handle.toLowerCase()))
  if (toAdd.length === 0) return { success: true, inserted: 0 }

  const base = existing.length
  const rows = toAdd.map((t, i) => {
    const r: (string | number)[] = new Array(17).fill('')
    r[COL.num] = base + i + 1
    r[COL.city] = t.city
    r[COL.category] = t.category
    r[COL.title] = t.title
    r[COL.chatUrl] = `https://t.me/${t.handle}`
    r[COL.members] = t.members ?? ''
    r[COL.status] = 'ожидает'
    return r
  })
  await appendRows(rows)
  return { success: true, inserted: toAdd.length }
})
