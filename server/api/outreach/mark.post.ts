import { z } from 'zod'
import { markPlacement } from '~/server/db/repositories/outreach.repo'
import { verifyMessage } from '~/server/utils/verifyMessage'
import type { PlacementState } from '~/types/outreach'

// Record the outcome of a placement. When marking 'sent' with a message link we
// auto-verify it (alive → 'verified', deleted → 'deleted'); otherwise the
// operator's chosen state stands. Screenshot URL is for chats with no permalink.
const bodySchema = z.object({
  placementId: z.number().int().positive(),
  state: z.enum(['sent', 'skipped', 'failed', 'verified', 'deleted']),
  messageUrl: z.string().max(300).optional(),
  screenshotUrl: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid body' })
  const { placementId, messageUrl, screenshotUrl, note } = parsed.data

  let state: PlacementState = parsed.data.state
  let verifiedAt: string | null = null
  let verifyState: string | null = null

  if (state === 'sent' && messageUrl) {
    const v = await verifyMessage(messageUrl)
    if (v) {
      verifyState = v.state
      if (v.state === 'alive') { state = 'verified'; verifiedAt = v.checkedAt }
      else if (v.state === 'deleted') { state = 'deleted' }
    }
  }

  await markPlacement(placementId, { state, messageUrl, screenshotUrl, note, verifiedAt })
  return { success: true, state, verifyState, error: null }
})
