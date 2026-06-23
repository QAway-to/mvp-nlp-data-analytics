import { listLeads } from '~/server/db/repositories/leads.repo'

// Public read of qualified leads (type='lead'), sorted by score. The money view.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const leads = await listLeads({
    type: 'lead',
    vertical: typeof q.vertical === 'string' ? q.vertical : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    limit: q.limit ? Math.min(Number(q.limit), 200) : 50,
    offset: q.offset ? Number(q.offset) : 0,
  })
  return { success: true, leads }
})
