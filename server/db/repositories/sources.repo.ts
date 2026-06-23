import { createError } from 'h3'
import { query } from '../client'
import type { SourceConfig, AdapterKey, SourceMode } from '~/types/pipeline'
import type { FieldMapping } from '~/types/pipeline'

interface SourceRow {
  id: number
  mode: string
  adapter: string
  url: string
  field_mapping: FieldMapping
  keyword: string | null
  vertical: string
  ttl_days: number
  enabled: boolean
  last_run_at: string | null
  health_score: number
  created_at: string
}

function rowToSourceConfig(row: SourceRow): SourceConfig {
  return {
    id: row.id,
    mode: row.mode as SourceMode,
    adapter: row.adapter as AdapterKey,
    url: row.url,
    fieldMapping: row.field_mapping,
    keyword: row.keyword,
    vertical: row.vertical,
    ttlDays: row.ttl_days,
    enabled: row.enabled,
  }
}

export async function listDueSources(limit: number): Promise<SourceConfig[]> {
  const result = await query<SourceRow>(
    `SELECT id, mode, adapter, url, field_mapping, keyword, vertical, ttl_days, enabled,
            last_run_at, health_score, created_at
     FROM sources
     WHERE enabled = TRUE
     ORDER BY health_score DESC, last_run_at ASC NULLS FIRST
     LIMIT $1`,
    [limit],
  )
  return result.rows.map(rowToSourceConfig)
}

export async function getSource(id: number): Promise<SourceConfig> {
  const result = await query<SourceRow>(
    `SELECT id, mode, adapter, url, field_mapping, keyword, vertical, ttl_days, enabled,
            last_run_at, health_score, created_at
     FROM sources
     WHERE id = $1`,
    [id],
  )
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Source not found' })
  }
  return rowToSourceConfig(result.rows[0])
}

export async function touchSource(id: number): Promise<void> {
  await query(
    `UPDATE sources SET last_run_at = now() WHERE id = $1`,
    [id],
  )
}

export async function updateHealth(id: number, qualified: number): Promise<void> {
  const qualSignal = qualified > 0 ? 1 : 0
  await query(
    `UPDATE sources
     SET health_score = health_score * 0.7 + $1 * 0.3
     WHERE id = $2`,
    [qualSignal, id],
  )
}
