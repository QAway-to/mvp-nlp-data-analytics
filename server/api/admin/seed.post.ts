import { seedSources } from '~/server/db/seed'

// Secret-protected idempotent seed of the verified starter-pack sources.
export default defineEventHandler(async (event) => {
  requireSecret(event)
  try {
    const result = await seedSources()
    return { success: true, ...result }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Seed failed'
    throw createError({ statusCode: 500, message })
  }
})
