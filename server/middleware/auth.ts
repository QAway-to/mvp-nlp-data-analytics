import { timingSafeEqual } from 'node:crypto'

// Whole-service password gate (pages + every API route). HTTP Basic Auth: the
// browser prompts once, then carries the header on all same-origin requests
// (page loads, assets, fetch/XHR) automatically. Any username; only the password
// is checked against APP_PASSWORD. Disabled when APP_PASSWORD is unset (local dev).
export default defineEventHandler((event) => {
  const expected = process.env.APP_PASSWORD
  if (!expected) return // gate off until configured (keeps local dev open)

  // Cron trigger endpoints carry their own ?key and must be reachable by external
  // cron services (which send a plain GET, no Basic auth) → exempt from the gate.
  if (getRequestURL(event).pathname.startsWith('/api/cron/')) return

  const header = getRequestHeader(event, 'authorization') ?? ''
  if (header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
    const password = decoded.slice(decoded.indexOf(':') + 1)
    const a = Buffer.from(password)
    const b = Buffer.from(expected)
    if (a.length === b.length && timingSafeEqual(a, b)) return // authorized
  }

  setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="benzinradar", charset="UTF-8"')
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
})
