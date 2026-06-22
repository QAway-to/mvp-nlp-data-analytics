import type { RawListing, SourceConfig, AdapterKey } from '~/types/pipeline'

// Cross-cutting fetch concerns injected into adapters (shared UA, timeout, retry).
export interface AdapterContext {
  fetchText: (url: string, init?: RequestInit) => Promise<string>
  fetchJson: <T>(url: string, init?: RequestInit) => Promise<T>
  logger: { warn: (m: string) => void; error: (m: string, e?: unknown) => void }
}

// An adapter only knows how to fetch+parse a source into RawListings.
// It never touches the DB, LLM, dedup, or routing — the pipeline owns those.
export interface SourceAdapter {
  readonly key: AdapterKey
  fetch(config: SourceConfig, ctx: AdapterContext): Promise<RawListing[]>
}

export type { RawListing, SourceConfig }
