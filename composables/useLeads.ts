import { useLocalStorage } from '@vueuse/core'
import type { Lead, LeadSource, SourceType } from '~/types'

const MAX_LEADS = 1000

function dedupeKey(l: Pick<Lead, 'sourceChannel' | 'sourceType' | 'rawMessage'>) {
  return `${l.sourceType}|${l.sourceChannel}|${l.rawMessage.slice(0, 80)}`
}

export function useLeads() {
  const leads = useLocalStorage<Lead[]>('leads_db', [])
  const rawSources = useLocalStorage<any[]>('leads_sources', [])

  // Migrate old sources (no id / no type) on first use
  const sources = computed<LeadSource[]>(() =>
    rawSources.value
      .filter((s: any) => s?.channel)
      .map((s: any) => ({
        id: s.id ?? (s._migrated_id = crypto.randomUUID(), s._migrated_id),
        channel: s.channel,
        type: (s.type ?? 'telegram') as SourceType,
        lastScrapedAt: s.lastScrapedAt ?? null,
        leadCount: s.leadCount ?? 0,
        status: (s.status === 'scraping' ? 'idle' : s.status) as LeadSource['status'],
        error: s.error,
      }))
  )

  function addLeads(incoming: Lead[]) {
    const existing = new Set(leads.value.map((l: Lead) => dedupeKey(l)))
    const fresh = incoming.filter(l => !existing.has(dedupeKey(l)))
    leads.value = [...leads.value, ...fresh]
    if (leads.value.length > MAX_LEADS) {
      leads.value = [...leads.value].sort((a, b) => b.score - a.score).slice(0, MAX_LEADS)
    }
  }

  function updateStatus(id: string, status: Lead['status']) {
    leads.value = leads.value.map(l => l.id === id ? { ...l, status } : l)
  }

  function removeLead(id: string) {
    leads.value = leads.value.filter(l => l.id !== id)
  }

  function clearAll() {
    leads.value = []
  }

  function upsertSource(channel: string, type: SourceType = 'telegram') {
    const normalized = type === 'telegram' ? channel.replace('@', '').toLowerCase().trim() : channel.trim()
    if (!normalized) return
    const exists = rawSources.value.find((s: any) => s.channel === normalized && (s.type ?? 'telegram') === type)
    if (exists) return
    rawSources.value = [...rawSources.value, {
      id: crypto.randomUUID(),
      channel: normalized,
      type,
      lastScrapedAt: null,
      leadCount: 0,
      status: 'idle',
    }]
  }

  function setSourceStatus(id: string, status: LeadSource['status'], error?: string) {
    rawSources.value = rawSources.value.map((s: any) =>
      s.id === id ? { ...s, status, ...(error !== undefined ? { error } : { error: undefined }) } : s
    )
  }

  function updateSourceStats(id: string, count: number) {
    rawSources.value = rawSources.value.map((s: any) =>
      s.id === id ? { ...s, leadCount: (s.leadCount ?? 0) + count, lastScrapedAt: new Date().toISOString() } : s
    )
  }

  function removeSource(id: string) {
    rawSources.value = rawSources.value.filter((s: any) => s.id !== id)
  }

  function exportCSV() {
    const rows = leads.value.map(l => [
      l.name ?? '', l.email ?? '', l.phone ?? '', l.username ?? '',
      l.company ?? '', l.intent, l.score, l.status, l.sourceType,
      l.sourceChannel, new Date(l.createdAt).toLocaleDateString(),
      l.messageUrl ?? '', l.rawMessage.replace(/\n/g, ' ').slice(0, 300)
    ])
    const header = ['Name', 'Email', 'Phone', 'Telegram', 'Company', 'Intent', 'Score', 'Status', 'SourceType', 'Source', 'Date', 'URL', 'Message']
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = computed(() => ({
    total: leads.value.length,
    highIntent: leads.value.filter(l => l.intent === 'high').length,
    contacted: leads.value.filter(l => l.status === 'contacted').length,
    qualified: leads.value.filter(l => l.status === 'qualified').length,
  }))

  return {
    leads, sources, stats,
    addLeads, updateStatus, removeLead, clearAll,
    upsertSource, setSourceStatus, updateSourceStats, removeSource,
    exportCSV,
  }
}