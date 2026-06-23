import { listVacancies } from '~/server/db/repositories/leads.repo'

// Public read of vacancies (type='vacancy') — the auto-apply mode's queue.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const vacancies = await listVacancies({
    vertical: typeof q.vertical === 'string' ? q.vertical : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    limit: q.limit ? Math.min(Number(q.limit), 200) : 50,
    offset: q.offset ? Number(q.offset) : 0,
  })
  return { success: true, vacancies }
})
