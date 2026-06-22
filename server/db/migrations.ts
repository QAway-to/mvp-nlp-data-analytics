// Ordered migrations as inline SQL (bundler-safe — no runtime .sql file reads).
// Each is idempotent (IF NOT EXISTS) so re-running is harmless.

export interface Migration {
  version: string
  sql: string
}

export const MIGRATIONS: Migration[] = [
  {
    version: '0001_init',
    sql: `
-- ───────────── sources ─────────────
CREATE TABLE IF NOT EXISTS sources (
  id            SERIAL PRIMARY KEY,
  mode          TEXT NOT NULL CHECK (mode IN ('lead','vacancy')),
  adapter       TEXT NOT NULL CHECK (adapter IN ('telegramWeb','telegramMtproto','htmlList','jsonApi')),
  url           TEXT NOT NULL,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  keyword       TEXT,
  vertical      TEXT NOT NULL,
  ttl_days      INTEGER NOT NULL DEFAULT 30 CHECK (ttl_days > 0),
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at   TIMESTAMPTZ,
  health_score  REAL NOT NULL DEFAULT 1.0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (adapter, url, vertical)
);
CREATE INDEX IF NOT EXISTS idx_sources_due ON sources (enabled, last_run_at) WHERE enabled = TRUE;

-- ───────────── source_runs ─────────────
CREATE TABLE IF NOT EXISTS source_runs (
  id          BIGSERIAL PRIMARY KEY,
  source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  fetched     INTEGER NOT NULL DEFAULT 0,
  new_items   INTEGER NOT NULL DEFAULT 0,
  qualified   INTEGER NOT NULL DEFAULT 0,
  errors      INTEGER NOT NULL DEFAULT 0,
  error_text  TEXT,
  status      TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','partial','failed'))
);
CREATE INDEX IF NOT EXISTS idx_runs_source ON source_runs (source_id, started_at DESC);

-- ───────────── contacts (person-level dedup) ─────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            BIGSERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('telegram','email','phone','whatsapp','url')),
  handle        TEXT NOT NULL,
  display       TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_count    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (type, handle)
);

-- ───────────── items (every surviving listing) ─────────────
CREATE TABLE IF NOT EXISTS items (
  id             BIGSERIAL PRIMARY KEY,
  source_id      INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  source_item_id TEXT NOT NULL,
  content_hash   TEXT NOT NULL,
  url            TEXT,
  title          TEXT,
  text           TEXT NOT NULL,
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','stale','closed')),
  processed      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (source_id, source_item_id)
);
CREATE INDEX IF NOT EXISTS idx_items_hash   ON items (content_hash);
CREATE INDEX IF NOT EXISTS idx_items_expiry ON items (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_items_unproc ON items (processed) WHERE processed = FALSE;

-- ───────────── leads (qualified items — the money table) ─────────────
CREATE TABLE IF NOT EXISTS leads (
  id             BIGSERIAL PRIMARY KEY,
  item_id        BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  contact_id     BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
  vertical       TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('lead','vacancy')),
  intent         TEXT NOT NULL CHECK (intent IN ('high','medium','low','none')),
  warmth         TEXT NOT NULL DEFAULT 'none' CHECK (warmth IN ('high','medium','low','none')),
  budget         TEXT,
  vertical_match REAL NOT NULL DEFAULT 0,
  scam_flag      BOOLEAN NOT NULL DEFAULT FALSE,
  score          INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_view    ON leads (vertical, type, status, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON leads (contact_id);
`,
  },
]
