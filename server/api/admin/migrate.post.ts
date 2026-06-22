import { runMigrations } from '~/server/db/migrate'

// Secret-protected one-shot migration trigger (free tier has no shell/build hook).
export default defineEventHandler(async (event) => {
  requireSecret(event)
  try {
    const result = await runMigrations()
    return { success: true, ...result }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Migration failed'
    throw createError({ statusCode: 500, message })
  }
})
