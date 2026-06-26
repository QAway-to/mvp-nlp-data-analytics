import { z } from 'zod'
import { verifyMessage, type MessageVerification } from '~/server/utils/verifyMessage'

// Thin wrapper — all logic lives in verifyMessage (shared with the send flow).

const bodySchema = z.object({
  url: z.string().min(1).max(300).refine(
    (v) => /t\.me\//i.test(v) || /^@?[a-zA-Z0-9_]+\/\d+$/.test(v),
    'Expected a t.me message link like t.me/<chat>/<id>',
  ),
})

interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: string | null
}

export default defineEventHandler(async (event): Promise<ApiResponse<MessageVerification>> => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Body must be { url: string }' })

  const result = await verifyMessage(parsed.data.url)
  if (!result) throw createError({ statusCode: 400, message: 'Expected a Telegram message link like t.me/<chat>/<id>' })

  return { success: true, data: result, error: null }
})
