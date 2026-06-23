import { query } from '../client'
import type { Intent, ContactType, LeadStatus } from '~/types/pipeline'

interface InsertLeadParams {
  itemId: number
  contactId: number | null
  vertical: string
  type: 'lead' | 'vacancy'
  intent: Intent
  warmth: Intent
  budget: string | null
  verticalMatch: number
  scamFlag: boolean
  score: number
}

interface LeadListFilters {
  vertical?: string
  type?: 'lead' | 'vacancy'
  status?: LeadStatus
  limit?: number
  offset?: number
}

interface LeadRow {
  id: string
  item_id: string
  contact_id: string | null
  vertical: string
  type: string
  intent: string
  warmth: string
  budget: string | null
  vertical_match: number
  scam_flag: boolean
  score: number
  status: string
  created_at: string
  contact_type: string | null
  contact_handle: string | null
}

export interface LeadRecord {
  id: number
  itemId: number
  contactId: number | null
  vertical: string
  type: 'lead' | 'vacancy'
  intent: Intent
  warmth: Intent
  budget: string | null
  verticalMatch: number
  scamFlag: boolean
  score: number
  status: LeadStatus
  createdAt: string
  contactType: ContactType | null
  contactHandle: string | null
}

function rowToLeadRecord(row: LeadRow): LeadRecord {
  return {
    id: Number(row.id),
    itemId: Number(row.item_id),
    contactId: row.contact_id ? Number(row.contact_id) : null,
    vertical: row.vertical,
    type: row.type as 'lead' | 'vacancy',
    intent: row.intent as Intent,
    warmth: row.warmth as Intent,
    budget: row.budget,
    verticalMatch: row.vertical_match,
    scamFlag: row.scam_flag,
    score: row.score,
    status: row.status as LeadStatus,
    createdAt: row.created_at,
    contactType: row.contact_type as ContactType | null,
    contactHandle: row.contact_handle,
  }
}

export async function insertLead(params: InsertLeadParams): Promise<void> {
  await query(
    `INSERT INTO leads (item_id, contact_id, vertical, type, intent, warmth, budget, vertical_match, scam_flag, score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (item_id) DO NOTHING`,
    [
      params.itemId,
      params.contactId,
      params.vertical,
      params.type,
      params.intent,
      params.warmth,
      params.budget,
      params.verticalMatch,
      params.scamFlag,
      params.score,
    ],
  )
}

export async function listLeads(filters: LeadListFilters = {}): Promise<LeadRecord[]> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (filters.vertical) {
    conditions.push(`l.vertical = $${idx++}`)
    values.push(filters.vertical)
  }
  if (filters.type) {
    conditions.push(`l.type = $${idx++}`)
    values.push(filters.type)
  }
  if (filters.status) {
    conditions.push(`l.status = $${idx++}`)
    values.push(filters.status)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  values.push(limit)
  values.push(offset)

  const result = await query<LeadRow>(
    `SELECT l.id, l.item_id, l.contact_id, l.vertical, l.type, l.intent, l.warmth,
            l.budget, l.vertical_match, l.scam_flag, l.score, l.status, l.created_at,
            c.type AS contact_type, c.handle AS contact_handle
     FROM leads l
     LEFT JOIN contacts c ON c.id = l.contact_id
     ${whereClause}
     ORDER BY l.score DESC, l.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values,
  )
  return result.rows.map(rowToLeadRecord)
}

export async function listVacancies(filters: Omit<LeadListFilters, 'type'> = {}): Promise<LeadRecord[]> {
  return listLeads({ ...filters, type: 'vacancy' })
}
