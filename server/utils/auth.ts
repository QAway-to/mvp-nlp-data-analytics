import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'

// Constant-time bearer-token guard for internal endpoints (cron, admin).
// Throws 401 when the token is missing or wrong.
export function requireSecret(event: H3Event): void {
  const expected = process.env.CRON_SECRET || useRuntimeConfig().cronSecret
  if (!expected) throw createError({ statusCode: 500, message: 'CRON_SECRET not configured' })

  const header = getRequestHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}
