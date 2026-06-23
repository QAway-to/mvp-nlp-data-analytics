import { listAllSources } from '~/server/db/repositories/sources.repo'

// Public read of the source registry + health/yield for the sources view.
export default defineEventHandler(async () => {
  const sources = await listAllSources()
  return { success: true, sources }
})
