import { query } from '../client'

interface UpsertItemParams {
  sourceId: number
  sourceItemId: string
  contentHash: string
  url: string | null
  title: string | null
  text: string
  ttlDays: number
}

interface UpsertItemResult {
  id: number
  isNew: boolean
}

interface UpsertRow {
  id: string
  is_new: boolean
}

interface ExistsRow {
  exists: string
}

interface SweepRow {
  count: string
}

export async function upsertItem(params: UpsertItemParams): Promise<UpsertItemResult> {
  const result = await query<UpsertRow>(
    `INSERT INTO items (source_id, source_item_id, content_hash, url, title, text, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval)
     ON CONFLICT (source_id, source_item_id) DO UPDATE
       SET last_seen_at = now(),
           status = CASE WHEN items.status = 'closed' THEN items.status ELSE 'active' END
     RETURNING id, (xmax = 0) AS is_new`,
    [
      params.sourceId,
      params.sourceItemId,
      params.contentHash,
      params.url,
      params.title,
      params.text,
      String(params.ttlDays),
    ],
  )
  const row = result.rows[0]
  return {
    id: Number(row.id),
    isNew: row.is_new,
  }
}

export async function existsByHash(contentHash: string, excludeSourceId: number): Promise<boolean> {
  const result = await query<ExistsRow>(
    `SELECT 1 AS exists
     FROM items
     WHERE content_hash = $1
       AND status <> 'closed'
       AND source_id <> $2
     LIMIT 1`,
    [contentHash, excludeSourceId],
  )
  return result.rows.length > 0
}

export async function markProcessed(id: number): Promise<void> {
  await query(
    `UPDATE items SET processed = TRUE WHERE id = $1`,
    [id],
  )
}

export async function sweepStale(): Promise<number> {
  const result = await query<SweepRow>(
    `WITH updated AS (
       UPDATE items
       SET status = 'stale'
       WHERE status = 'active' AND expires_at < now()
       RETURNING id
     )
     SELECT COUNT(*) AS count FROM updated`,
  )
  return Number(result.rows[0]?.count ?? 0)
}
