import { query } from '../client'

interface FinishRunParams {
  fetched: number
  newItems: number
  qualified: number
  errors: number
  errorText?: string | null
  status: 'ok' | 'partial' | 'failed'
}

interface RunRow {
  id: string
}

export async function startRun(sourceId: number): Promise<number> {
  const result = await query<RunRow>(
    `INSERT INTO source_runs (source_id) VALUES ($1) RETURNING id`,
    [sourceId],
  )
  return Number(result.rows[0].id)
}

export async function finishRun(
  runId: number,
  params: FinishRunParams,
): Promise<void> {
  await query(
    `UPDATE source_runs
     SET finished_at = now(),
         fetched     = $2,
         new_items   = $3,
         qualified   = $4,
         errors      = $5,
         error_text  = $6,
         status      = $7
     WHERE id = $1`,
    [
      runId,
      params.fetched,
      params.newItems,
      params.qualified,
      params.errors,
      params.errorText ?? null,
      params.status,
    ],
  )
}
