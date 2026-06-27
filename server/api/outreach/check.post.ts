import { z } from 'zod'
import { assessChat } from '~/server/utils/assessChat'
import { readQueue, batchWrite, cellRange, COL, type CellUpdate } from '~/server/utils/sheets'

// Batch pre-flight: assess a slice of un-checked rows (alive / active / ad-policy)
// and write the verdict back to the sheet (cols M/N + online/activity). Processed
// in small chunks to stay within the request timeout; the UI calls repeatedly.
const bodySchema = z.object({
  limit: z.number().int().min(1).max(15).optional(),
  force: z.boolean().optional(), // re-check even rows that already have a verdict
})
const GAP_MS = 350

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event).catch(() => ({})))
  const limit = parsed.success ? parsed.data.limit ?? 8 : 8
  const force = parsed.success ? parsed.data.force ?? false : false

  const rows = await readQueue()
  const pending = rows.filter((r) => force || !r.verdict).slice(0, limit)

  const updates: CellUpdate[] = []
  const verdicts: Array<{ handle: string; verdict: string }> = []

  for (const r of pending) {
    const a = await assessChat(r.handle)
    if (a) {
      const verdict = a.recommendation.toUpperCase()
      updates.push({ range: `${cellRange(COL.verdict, r.row)}:${cellRange(COL.reason, r.row)}`, values: [[verdict, a.reasons.join('; ')]] })
      updates.push({ range: `${cellRange(COL.online, r.row)}:${cellRange(COL.activity, r.row)}`, values: [[a.online ?? '', a.activity]] })
      if (a.members != null) updates.push({ range: cellRange(COL.members, r.row), values: [[a.members]] })
      verdicts.push({ handle: r.handle, verdict })
    }
    await new Promise((res) => setTimeout(res, GAP_MS))
  }

  await batchWrite(updates)
  // Rows still without a verdict after this batch (drives the UI's repeat loop).
  const remaining = rows.filter((r) => !r.verdict).length - verdicts.length
  return { success: true, checked: verdicts.length, remaining: Math.max(0, remaining), verdicts }
})
