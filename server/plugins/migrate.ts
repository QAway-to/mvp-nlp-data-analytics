import { runMigrations } from '~/server/db/migrate'

// Apply pending DB migrations once on server boot. Render's free tier has no
// release/shell hook, so instead of relying on the secret-protected manual
// endpoint, migrations self-apply at startup. They are idempotent (guarded by
// schema_migrations), so re-running on every cold start is a cheap no-op. A
// failure here is logged but never blocks the server from starting.
export default defineNitroPlugin(async () => {
  if (!process.env.DATABASE_URL && !useRuntimeConfig().databaseUrl) {
    console.warn('[migrate] skipped on boot — DATABASE_URL not configured')
    return
  }
  try {
    const { applied } = await runMigrations()
    if (applied.length > 0) console.log(`[migrate] applied on boot: ${applied.join(', ')}`)
  } catch (e) {
    console.error('[migrate] boot migration failed:', e instanceof Error ? e.message : e)
  }
})
