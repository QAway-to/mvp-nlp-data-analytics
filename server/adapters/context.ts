import { createError } from 'h3'
import type { AdapterContext } from './types'
import { BROWSER_UA } from '~/server/utils/leads'

const FETCH_TIMEOUT_MS = 12_000

// Single retry on transient network/429 failures.
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': BROWSER_UA, ...(init?.headers ?? {}) },
      })
      if (res.status === 429 && attempt === 0) continue
      return res
    } catch (e) {
      if (attempt === 1) throw e
    }
  }
  throw new Error('unreachable')
}

export function createAdapterContext(): AdapterContext {
  return {
    async fetchText(url, init) {
      const res = await fetchWithRetry(url, init)
      if (!res.ok) throw createError({ statusCode: 502, message: `Fetch ${url} → HTTP ${res.status}` })
      return res.text()
    },
    async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
      const res = await fetchWithRetry(url, init)
      if (!res.ok) throw createError({ statusCode: 502, message: `Fetch ${url} → HTTP ${res.status}` })
      return res.json() as Promise<T>
    },
    logger: {
      warn: (m) => console.warn(`[adapter] ${m}`),
      error: (m, e) => console.error(`[adapter] ${m}`, e instanceof Error ? e.message : e),
    },
  }
}
