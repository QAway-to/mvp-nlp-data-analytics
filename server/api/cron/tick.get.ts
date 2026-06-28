// Cron-friendly trigger for external schedulers (cron-job.org etc.): a plain GET
// with a ?key token, exempt from the Basic-auth gate (see server/middleware/auth.ts).
// Internally calls the POST /api/send-due with the service password so all the
// posting logic stays in one place. URL: /api/cron/tick?key=<APP_PASSWORD>
export default defineEventHandler(async (event) => {
  const key = String(getQuery(event).key ?? '')
  const pw = process.env.APP_PASSWORD ?? ''
  if (!pw || key !== pw) throw createError({ statusCode: 401, statusMessage: 'bad key' })

  const auth = 'Basic ' + Buffer.from(`cron:${pw}`).toString('base64')
  try {
    const result = await $fetch('/api/send-due', {
      method: 'POST',
      baseURL: getRequestURL(event).origin,
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: {},
      timeout: 150_000,
    })
    return { ok: true, result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
})
