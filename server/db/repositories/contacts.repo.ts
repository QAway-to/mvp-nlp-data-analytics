import { query } from '../client'
import type { ContactType } from '~/types/pipeline'

interface UpsertContactParams {
  type: ContactType
  handle: string
  display?: string | null
}

interface ContactRow {
  id: string
}

export async function upsertContact(params: UpsertContactParams): Promise<number> {
  const result = await query<ContactRow>(
    `INSERT INTO contacts (type, handle, display)
     VALUES ($1, $2, $3)
     ON CONFLICT (type, handle) DO UPDATE
       SET last_seen_at = now(),
           lead_count   = contacts.lead_count + 1
     RETURNING id`,
    [params.type, params.handle, params.display ?? null],
  )
  return Number(result.rows[0].id)
}
