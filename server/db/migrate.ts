import { withTransaction, query } from './client'
import { MIGRATIONS } from './migrations'

// Apply any unapplied migrations in order. Idempotent and safe to re-run.
export async function runMigrations(): Promise<{ applied: string[]; alreadyApplied: string[] }> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  const { rows } = await query<{ version: string }>('SELECT version FROM schema_migrations')
  const done = new Set(rows.map(r => r.version))

  const applied: string[] = []
  const alreadyApplied: string[] = []

  for (const m of MIGRATIONS) {
    if (done.has(m.version)) {
      alreadyApplied.push(m.version)
      continue
    }
    await withTransaction(async client => {
      await client.query(m.sql)
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version])
    })
    applied.push(m.version)
  }

  return { applied, alreadyApplied }
}
