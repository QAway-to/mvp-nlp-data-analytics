import { z } from 'zod'
import { verifyMessage } from '~/server/utils/verifyMessage'
import { batchWrite, cellRange, COL, type CellUpdate, type Status } from '~/server/utils/sheets'

// Record a placement outcome straight into the sheet row. When marking 'размещено'
// with a message link we auto-verify (alive → 'проверено', deleted → 'удалено').
// Screenshot URL is for chats with no public permalink.
const bodySchema = z.object({
  row: z.number().int().min(2),
  status: z.enum(['размещено', 'пропущено']),
  messageUrl: z.string().max(300).optional(),
  screenshotUrl: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
})

function today(): string {
  return new Date().toLocaleDateString('ru-RU')
}

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid body' })
  const { row, messageUrl, screenshotUrl } = parsed.data

  let status: Status = parsed.data.status
  let verifiedAt = ''
  let verifyState: string | null = null
  const updates: CellUpdate[] = []

  if (status === 'размещено') {
    updates.push({ range: cellRange(COL.postedDate, row), values: [[today()]] })
    if (messageUrl) {
      updates.push({ range: cellRange(COL.messageUrl, row), values: [[messageUrl]] })
      const v = await verifyMessage(messageUrl)
      if (v) {
        verifyState = v.state
        if (v.state === 'alive') { status = 'проверено'; verifiedAt = `✅ ${today()}` }
        else if (v.state === 'deleted') { status = 'удалено' }
      }
    }
    if (screenshotUrl) updates.push({ range: cellRange(COL.screenshot, row), values: [[screenshotUrl]] })
  }

  updates.push({ range: cellRange(COL.status, row), values: [[status]] })
  if (verifiedAt) updates.push({ range: cellRange(COL.verifiedAt, row), values: [[verifiedAt]] })
  await batchWrite(updates)

  const note = status === 'размещено' && !messageUrl && !screenshotUrl
    ? 'без ссылки и скриншота — проверить размещение нечем'
    : undefined
  return { success: true, status, verifyState, note, error: null }
})
