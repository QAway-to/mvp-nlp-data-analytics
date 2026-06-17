import { useLocalStorage } from '@vueuse/core'
import type { Lead, LeadSource } from '~/types'

const MAX_LEADS = 1000

function dedupeKey(l: Pick<Lead, 'sourceChannel' | 'rawMessage'>) {
  return `${l.sourceChannel}|${l.rawMessage.slice(0, 80)}`
}

export function useLeads() {
  const leads = useLocalStorage<Lead[]>('leads_db', [])
  const sources = useLocalStorage<LeadSource[]>('leads_sources', [])

  function addLeads(incoming: Lead[]) {
    const existing = new Set(leads.value.map(dedupeKey))
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

  function upsertSource(channel: string) {
    const normalized = channel.replace('@', '').toLowerCase().trim()
    if (!normalized) return
    if (!sources.value.find(s => s.channel === normalized)) {
      sources.value = [...sources.value, { channel: normalized, lastScrapedAt: null, leadCount: 0, status: 'idle' }]
    }
  }

  function setSourceStatus(channel: string, status: LeadSource['status'], error?: string) {
    sources.value = sources.value.map(s =>
      s.channel === channel ? { ...s, status, error: error ?? s.error } : s
    )
  }

  function updateSourceStats(channel: string, count: number) {
    sources.value = sources.value.map(s =>
      s.channel === channel
        ? { ...s, leadCount: s.leadCount + count, lastScrapedAt: new Date().toISOString() }
        : s
    )
  }

  function removeSource(channel: string) {
    sources.value = sources.value.filter(s => s.channel !== channel)
  }

  function exportCSV() {
    const rows = leads.value.map(l => [
      l.name ?? '', l.email ?? '', l.phone ?? '', l.username ?? '',
      l.company ?? '', l.intent, l.score, l.status,
      l.sourceChannel, new Date(l.createdAt).toLocaleDateString(),
      l.messageUrl ?? '', l.rawMessage.replace(/\n/g, ' ').slice(0, 300)
    ])
    const header = ['Name', 'Email', 'Phone', 'Telegram', 'Company', 'Intent', 'Score', 'Status', 'Source', 'Date', 'URL', 'Message']
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