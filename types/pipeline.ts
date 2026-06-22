// Shared pipeline contracts (client + server). No server-only imports here.

export type SourceMode = 'lead' | 'vacancy'
export type AdapterKey = 'telegramWeb' | 'telegramMtproto' | 'htmlList' | 'jsonApi'
export type ContactType = 'telegram' | 'email' | 'phone' | 'whatsapp' | 'url'
export type Intent = 'high' | 'medium' | 'low' | 'none'
export type ItemStatus = 'active' | 'stale' | 'closed'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'rejected'

// One discovered listing emitted by an adapter — pre-LLM, pre-dedup.
export interface RawListing {
  sourceItemId: string          // stable per-source id (tg msg id, /task/view/{id}, job id) → level-A dedup
  url: string | null            // permalink
  title: string | null
  text: string                  // full normalized text → prefilter + LLM
  postedAt: string | null       // ISO if exposed, else null
  // Implicit contact carried by the source itself (e.g. Telegram sender), independent of text.
  impliedContact?: { type: ContactType; handle: string } | null
  raw?: Record<string, unknown> // adapter-specific extras
}

// Field-mapping config stored in the `sources` row, consumed by jsonApi/htmlList adapters.
export interface FieldMapping {
  itemsPath?: string            // JSON: dot-path to the array ('' = top-level)
  id?: string
  url?: string
  title?: string
  textFields?: string[]         // concatenated into RawListing.text
  skipFirst?: number            // e.g. RemoteOK index-0 metadata
  // html list mode
  listLinkPattern?: string      // regex for detail links on the list page
  detailTextSelector?: string   // regex/marker for the detail body
}

export interface SourceConfig {
  id: number
  mode: SourceMode
  adapter: AdapterKey
  url: string
  fieldMapping: FieldMapping
  keyword: string | null        // local filter
  vertical: string              // 'freelance-dev' in Phase 1
  ttlDays: number
  enabled: boolean
}

// Stage-B LLM output per item. Untrusted — validated with zod at the boundary.
// Intent is the PRIMARY signal; budget/urgency/contact are qualifiers, not gates.
export interface BantResult {
  type: 'lead' | 'vacancy' | 'noise'   // routing decision (noise = freelancer self-promo / off-topic)
  intent: Intent                        // strength of buying/hiring intention
  warmth: Intent                        // urgency / how "hot" — sortable
  budget: string | null                 // freeform ('$2-3k', 'договорная', null)
  contact: { type: ContactType; handle: string } | null  // extracted from text (enriches impliedContact)
  verticalMatch: number                 // 0..1 relevance to the source's vertical
  scamFlag: boolean
}
