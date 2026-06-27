import { verifyMessage } from '~/server/utils/verifyMessage'
import { readQueue, batchWrite, cellRange, COL, type CellUpdate } from '~/server/utils/sheets'

// Re-verify every posted placement that has a permalink: confirm it's still live
// or flag it 'удалено'. Safe entry point for a free external cron (also wakes the
// spun-down free instance). No auth — same as the other outreach endpoints.
const GAP_MS = 300

export default defineEventHandler(async () => {
  const rows = await readQueue()
  const toCheck = rows.filter((r) => r.messageUrl && ['размещено', 'проверено'].includes(r.status.toLowerCase()))

  const updates: CellUpdate[] = []
  let checked = 0
  let deleted = 0

  for (const r of toCheck) {
    const v = await verifyMessage(r.messageUrl)
    if (v) {
      checked++
      if (v.state === 'deleted') {
        deleted++
        updates.push({ range: cellRange(COL.status, r.row), values: [['удалено']] })
      } else if (v.state === 'alive') {
        updates.push({ range: cellRange(COL.status, r.row), values: [['проверено']] })
        updates.push({ range: cellRange(COL.verifiedAt, r.row), values: [[`✅ ${new Date().toLocaleDateString('ru-RU')}`]] })
      }
    }
    await new Promise((res) => setTimeout(res, GAP_MS))
  }

  await batchWrite(updates)
  return { success: true, checked, deleted }
})
