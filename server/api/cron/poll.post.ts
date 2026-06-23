import { defineEventHandler, readBody } from 'h3'
import { requireSecret } from '~/server/utils/auth'
import { listDueSources, getSource } from '~/server/db/repositories/sources.repo'
import { sweepStale } from '~/server/db/repositories/items.repo'
import { runSource, type RunSummary } from '~/server/pipeline/run'

interface PollBody {
  sourceId?: number
  limit?: number
}

interface RunResult extends RunSummary {
  error?: string
}

export default defineEventHandler(async (event) => {
  requireSecret(event)

  const body = await readBody<PollBody>(event).catch(() => ({} as PollBody))
  const runs: RunResult[] = []

  // Stale sweep once per poll cycle (not per source).
  await sweepStale().catch((err) => console.error('[poll] sweepStale failed:', err instanceof Error ? err.message : err))

  if (body?.sourceId != null) {
    const config = await getSource(Number(body.sourceId))
    try {
      const summary = await runSource(config)
      runs.push(summary)
    } catch (err) {
      runs.push({
        sourceId: config.id,
        fetched: 0,
        newItems: 0,
        qualified: 0,
        errors: 1,
        runId: -1,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  } else {
    const sources = await listDueSources(body?.limit ?? 3)
    for (const config of sources) {
      try {
        const summary = await runSource(config)
        runs.push(summary)
      } catch (err) {
        runs.push({
          sourceId: config.id,
          fetched: 0,
          newItems: 0,
          qualified: 0,
          errors: 1,
          runId: -1,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return { success: true, runs }
})
