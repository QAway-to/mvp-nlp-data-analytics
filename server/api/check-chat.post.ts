import { z } from 'zod'
import { assessChat, type ChatAssessment } from '~/server/utils/assessChat'

// On-demand pre-flight gate for a single candidate placement target.
// All logic lives in assessChat (shared with the batch queue check).

const bodySchema = z.object({ chat: z.string().min(1).max(120) })

interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: string | null
}

export default defineEventHandler(async (event): Promise<ApiResponse<ChatAssessment>> => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Body must be { chat: string }' })

  const assessment = await assessChat(parsed.data.chat)
  if (!assessment) throw createError({ statusCode: 400, message: 'Invalid chat handle' })

  return { success: true, data: assessment, error: null }
})
