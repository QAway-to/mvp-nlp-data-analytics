import type { SourceAdapter } from './types'
import type { AdapterKey } from '~/types/pipeline'
import { telegramWebAdapter } from './telegramWeb.adapter'

// adapterKey → adapter instance. New adapters register here once; new SOURCES
// are just config rows pointing at an existing adapter.
const ADAPTERS: Partial<Record<AdapterKey, SourceAdapter>> = {
  telegramWeb: telegramWebAdapter,
  // telegramMtproto, htmlList, jsonApi — added next.
}

export function getAdapter(key: AdapterKey): SourceAdapter {
  const adapter = ADAPTERS[key]
  if (!adapter) throw createError({ statusCode: 500, message: `No adapter registered for '${key}'` })
  return adapter
}
