import { generateMessage } from '~/server/utils/genMessage'

// Thin endpoint over the shared generator — used by the UI "Copy" button.
export default defineEventHandler(async () => {
  const { text, source } = await generateMessage()
  return { success: true, text, source }
})
