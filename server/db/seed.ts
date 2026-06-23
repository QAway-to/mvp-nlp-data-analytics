import { query } from './client'

// Verified starter pack (probed live via t.me/s/ + lead-content check, 2026-06).
// Telegram channels use the telegramWeb adapter (ready) → enabled.
// Boards await htmlList/jsonApi adapters → seeded disabled, flip enabled later.
// Quality control past this point is the BANT pipeline + source_health, not the seed.

interface SeedSource {
  mode: 'lead' | 'vacancy'
  adapter: 'telegramWeb' | 'telegramMtproto' | 'htmlList' | 'jsonApi'
  url: string
  vertical: string
  ttlDays: number
  enabled: boolean
  keyword?: string | null
}

const TG = (url: string): SeedSource => ({ mode: 'lead', adapter: 'telegramWeb', url, vertical: 'freelance-dev', ttlDays: 7, enabled: true })
const BOARD = (adapter: SeedSource['adapter'], url: string): SeedSource => ({ mode: 'lead', adapter, url, vertical: 'freelance-dev', ttlDays: 7, enabled: false })

export const SEED_SOURCES: SeedSource[] = [
  // ── Verified Telegram RU (client orders) ──
  TG('freelansim_ru'), TG('seo_orders'), TG('frilanser_vacansii'), TG('digitaltender'),
  TG('freelance_orders'), TG('freelancetaverna'), TG('cgfreelance'), TG('Easy_wrk'),
  TG('rabotka_zdes'), TG('FrWork3'), TG('FreeWorkFeed'), TG('textmoney'),
  TG('distantsiya2'), TG('smm_leads'), TG('textodromo'), TG('designer_ru'), TG('kadrof_work'),
  // ── Verified Telegram EN ──
  TG('sgfreelancing'), TG('itfreelancers'), TG('remoters'), TG('remotejobss'),
  // ── Verified boards (disabled until their adapters land) ──
  BOARD('htmlList', 'https://fl.ru/projects/'),
  BOARD('htmlList', 'https://freelance.ru/project/search'),
  BOARD('htmlList', 'https://freelancehunt.com/projects/'),
  BOARD('htmlList', 'https://www.workzilla.com/tasks/'),
  BOARD('htmlList', 'https://weblancer.net/jobs/'),
  BOARD('htmlList', 'https://kwork.ru/projects'),
  BOARD('jsonApi', 'https://profi.ru/'),
  BOARD('htmlList', 'https://www.peopleperhour.com/freelance-jobs'),
  BOARD('htmlList', 'https://www.reddit.com/r/freelance_forhire/new/'),
  BOARD('htmlList', 'https://www.reddit.com/r/forhire/'),
]

// Idempotent upsert keyed on the UNIQUE(adapter, url, vertical) constraint.
export async function seedSources(): Promise<{ inserted: number; total: number }> {
  let inserted = 0
  for (const s of SEED_SOURCES) {
    const res = await query(
      `INSERT INTO sources (mode, adapter, url, vertical, ttl_days, enabled, keyword)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (adapter, url, vertical) DO NOTHING`,
      [s.mode, s.adapter, s.url, s.vertical, s.ttlDays, s.enabled, s.keyword ?? null],
    )
    inserted += res.rowCount ?? 0
  }
  return { inserted, total: SEED_SOURCES.length }
}
