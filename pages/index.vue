<template>
  <div class="flex gap-6 min-h-[calc(100vh-10rem)]">

    <!-- Sidebar: Sources -->
    <aside class="w-72 shrink-0 space-y-4">
      <div class="bg-slate-800/60 rounded-2xl border border-white/10 p-4 space-y-3">
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <i class="pi pi-database text-indigo-400"></i> Sources
        </h2>

        <!-- Source type tabs -->
        <div class="grid grid-cols-4 gap-1 p-1 bg-slate-900/60 rounded-xl">
          <button
            v-for="(cfg, type) in SOURCE_CONFIG"
            :key="type"
            @click="newSourceType = (type as SourceType)"
            class="flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
            :class="newSourceType === type ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'"
          >
            <i :class="['pi text-xs', cfg.icon]"></i>
            {{ cfg.label }}
          </button>
        </div>

        <!-- Input -->
        <div class="flex gap-2">
          <input
            v-model="newQuery"
            @keydown.enter="handleAddSource"
            :placeholder="SOURCE_CONFIG[newSourceType].placeholder"
            class="flex-1 min-w-0 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            @click="handleAddSource"
            class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0"
          >
            <i class="pi pi-plus"></i>
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="src in sources"
            :key="src.id"
            class="group flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/15 transition-colors"
          >
            <div class="shrink-0">
              <i :class="['pi text-sm', SOURCE_CONFIG[src.type].icon, SOURCE_CONFIG[src.type].color]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-white truncate">
                {{ src.type === 'telegram' ? '@' : '' }}{{ src.channel }}
              </div>
              <div class="text-[10px] text-slate-500 mt-0.5">
                <span v-if="src.status === 'scraping'" class="text-indigo-400 animate-pulse">Scanning...</span>
                <span v-else-if="src.status === 'error'" class="text-red-400">{{ src.error ?? 'Error' }}</span>
                <span v-else-if="src.lastScrapedAt">{{ src.leadCount }} leads · {{ formatDate(src.lastScrapedAt) }}</span>
                <span v-else class="text-slate-600">Not scraped yet</span>
              </div>
            </div>
            <button
              @click="handleScrape(src)"
              :disabled="src.status === 'scraping'"
              class="text-slate-500 hover:text-indigo-400 disabled:opacity-30 transition-colors"
              title="Scrape now"
            >
              <i :class="['pi', src.status === 'scraping' ? 'pi-spin pi-spinner' : 'pi-refresh']" class="text-sm"></i>
            </button>
            <button
              @click="removeSource(src.id)"
              class="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <i class="pi pi-times text-xs"></i>
            </button>
          </div>

          <div v-if="!sources.length" class="text-center py-6 text-slate-600 text-xs">
            Add a source above<br>to start collecting leads
          </div>
        </div>

        <button
          v-if="sources.length"
          @click="handleScrapeAll"
          :disabled="sources.some(s => s.status === 'scraping')"
          class="w-full bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-40"
        >
          <i class="pi pi-sync mr-1.5"></i> Scrape All Sources
        </button>
      </div>

      <!-- Stats -->
      <div class="bg-slate-800/60 rounded-2xl border border-white/10 p-4 space-y-3">
        <h2 class="text-sm font-bold text-white">Stats</h2>
        <div class="space-y-2">
          <div v-for="stat in statRows" :key="stat.label" class="flex justify-between text-sm">
            <span class="text-slate-400">{{ stat.label }}</span>
            <span :class="stat.color" class="font-bold font-mono">{{ stat.value }}</span>
          </div>
        </div>
      </div>

      <!-- Source legend -->
      <div class="bg-slate-800/40 rounded-2xl border border-white/5 p-4 space-y-2">
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sources</h2>
        <div v-for="(cfg, type) in SOURCE_CONFIG" :key="type" class="flex items-center gap-2 text-xs">
          <i :class="['pi text-sm', cfg.icon, cfg.color]"></i>
          <span class="font-medium" :class="cfg.color">{{ cfg.label }}</span>
          <span class="text-slate-600">— {{ cfg.hint }}</span>
        </div>
      </div>
    </aside>

    <!-- Main: Leads Table -->
    <main class="flex-1 min-w-0 space-y-4">

      <!-- Header + Controls -->
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-lg font-bold text-white flex items-center gap-2 mr-auto">
          <i class="pi pi-users text-indigo-400"></i>
          Lead Database
          <span class="text-slate-500 font-normal text-sm">{{ filteredLeads.length }} shown</span>
        </h1>

        <input
          v-model="search"
          placeholder="Search name, company, contact..."
          class="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors w-52"
        />

        <select
          v-model="filterSource"
          class="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All sources</option>
          <option value="telegram">Telegram</option>
          <option value="hh">hh.ru</option>
          <option value="fl">FL.ru</option>
          <option value="habr">Habr</option>
          <option value="hn">Hacker News</option>
          <option value="remoteok">RemoteOK</option>
          <option value="remotive">Remotive</option>
          <option value="wwr">We Work Remotely</option>
        </select>

        <select
          v-model="filterIntent"
          class="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All intent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="none">None</option>
        </select>

        <select
          v-model="filterStatus"
          class="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="rejected">Rejected</option>
        </select>

        <button
          @click="exportCSV"
          class="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm transition-colors"
        >
          <i class="pi pi-download text-xs"></i> CSV
        </button>

        <button
          v-if="leads.length"
          @click="clearAll"
          class="text-slate-500 hover:text-red-400 text-sm transition-colors"
          title="Clear all leads"
        >
          <i class="pi pi-trash"></i>
        </button>
      </div>

      <!-- Toast -->
      <div
        v-if="toast"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border"
        :class="toast.type === 'success' ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-red-900/30 border-red-500/30 text-red-400'"
      >
        <i :class="toast.type === 'success' ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"></i>
        {{ toast.message }}
      </div>

      <!-- Empty state -->
      <div v-if="!filteredLeads.length && !leads.length" class="rounded-2xl bg-slate-800/40 border border-dashed border-white/10 py-20 text-center">
        <i class="pi pi-inbox text-4xl text-slate-600 mb-4 block"></i>
        <p class="text-slate-400 font-medium">No leads yet</p>
        <p class="text-slate-600 text-sm mt-1">Add a source in the sidebar and click Scrape</p>
      </div>

      <div v-else-if="!filteredLeads.length" class="rounded-2xl bg-slate-800/40 border border-white/10 py-12 text-center text-slate-500 text-sm">
        No leads match your filters
      </div>

      <!-- Table -->
      <div v-else class="rounded-2xl border border-white/10 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-800/80 border-b border-white/10 text-left">
              <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Score</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Company</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Intent</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-32">Status</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Source</th>
              <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              v-for="lead in pagedLeads"
              :key="lead.id"
              class="bg-slate-900/60 hover:bg-slate-800/60 transition-colors group cursor-pointer"
              @click="previewLead = lead"
            >
              <!-- Score -->
              <td class="px-4 py-3" @click.stop>
                <div class="flex flex-col items-center gap-1">
                  <span class="text-base font-bold font-mono" :class="scoreColor(lead.score)">{{ lead.score }}</span>
                  <div class="w-10 h-1 rounded-full bg-slate-700 overflow-hidden">
                    <div class="h-full rounded-full" :class="scoreBarColor(lead.score)" :style="{ width: lead.score + '%' }"></div>
                  </div>
                </div>
              </td>

              <!-- Contact -->
              <td class="px-4 py-3">
                <div class="font-medium text-white">{{ lead.name ?? '—' }}</div>
                <div class="text-xs text-slate-400 mt-0.5 space-x-2">
                  <span v-if="lead.email">✉ {{ lead.email }}</span>
                  <span v-if="lead.phone">📞 {{ lead.phone }}</span>
                  <span v-if="lead.username">💬 {{ lead.username }}</span>
                </div>
              </td>

              <!-- Company -->
              <td class="px-4 py-3 text-slate-300">{{ lead.company ?? '—' }}</td>

              <!-- Intent -->
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="intentClass(lead.intent)">
                  {{ lead.intent }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-4 py-3" @click.stop>
                <select
                  :value="lead.status"
                  @change="updateStatus(lead.id, ($event.target as HTMLSelectElement).value as any)"
                  class="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-full"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>

              <!-- Source -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <i :class="['pi text-xs', SOURCE_CONFIG[lead.sourceType ?? 'telegram'].icon, SOURCE_CONFIG[lead.sourceType ?? 'telegram'].color]"></i>
                  <span class="text-xs text-slate-400 truncate max-w-[100px]">{{ lead.sourceChannel }}</span>
                </div>
                <div class="text-[10px] text-slate-600 mt-0.5">{{ formatDate(lead.createdAt) }}</div>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3" @click.stop>
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    v-if="lead.messageUrl"
                    :href="lead.messageUrl"
                    target="_blank"
                    class="text-slate-500 hover:text-indigo-400 transition-colors"
                    title="View original"
                  >
                    <i class="pi pi-external-link text-xs"></i>
                  </a>
                  <button
                    @click="removeLead(lead.id)"
                    class="text-slate-600 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <i class="pi pi-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between text-sm text-slate-400">
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <div class="flex gap-2">
          <button @click="currentPage--" :disabled="currentPage === 1"
            class="px-3 py-1 bg-slate-800 border border-white/10 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors">
            ← Prev
          </button>
          <button @click="currentPage++" :disabled="currentPage === totalPages"
            class="px-3 py-1 bg-slate-800 border border-white/10 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors">
            Next →
          </button>
        </div>
      </div>

      <!-- Message preview modal -->
      <div
        v-if="previewLead"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="previewLead = null"
      >
        <div class="bg-slate-800 border border-white/15 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i :class="['pi', SOURCE_CONFIG[previewLead.sourceType ?? 'telegram'].icon, SOURCE_CONFIG[previewLead.sourceType ?? 'telegram'].color]"></i>
              <h3 class="font-bold text-white">{{ previewLead.company ?? previewLead.name ?? 'Lead Details' }}</h3>
            </div>
            <button @click="previewLead = null" class="text-slate-400 hover:text-white transition-colors">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div v-if="previewLead.name" class="space-y-0.5">
              <div class="text-xs text-slate-500 uppercase tracking-wide">Name</div>
              <div class="text-white">{{ previewLead.name }}</div>
            </div>
            <div v-if="previewLead.company" class="space-y-0.5">
              <div class="text-xs text-slate-500 uppercase tracking-wide">Company</div>
              <div class="text-white">{{ previewLead.company }}</div>
            </div>
            <div v-if="previewLead.email" class="space-y-0.5">
              <div class="text-xs text-slate-500 uppercase tracking-wide">Email</div>
              <div class="text-indigo-400">{{ previewLead.email }}</div>
            </div>
            <div v-if="previewLead.phone" class="space-y-0.5">
              <div class="text-xs text-slate-500 uppercase tracking-wide">Phone</div>
              <div class="text-indigo-400">{{ previewLead.phone }}</div>
            </div>
            <div v-if="previewLead.username" class="space-y-0.5">
              <div class="text-xs text-slate-500 uppercase tracking-wide">Telegram</div>
              <div class="text-blue-400">{{ previewLead.username }}</div>
            </div>
            <div class="space-y-0.5">
              <div class="text-xs text-slate-500 uppercase tracking-wide">Intent</div>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="intentClass(previewLead.intent)">
                {{ previewLead.intent }}
              </span>
            </div>
          </div>
          <div class="space-y-1.5">
            <div class="text-xs text-slate-500 uppercase tracking-wide">Original Message</div>
            <p class="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-slate-900/60 rounded-xl p-3 max-h-40 overflow-y-auto">{{ previewLead.rawMessage }}</p>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span>{{ SOURCE_CONFIG[previewLead.sourceType ?? 'telegram'].label }} · {{ previewLead.sourceChannel }} · {{ formatDate(previewLead.createdAt) }}</span>
            <a v-if="previewLead.messageUrl" :href="previewLead.messageUrl" target="_blank" class="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View original <i class="pi pi-external-link text-xs"></i>
            </a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Lead, LeadSource, SourceType } from '~/types'

definePageMeta({ layout: 'default' })
useHead({ title: 'NLP Lead Generator' })

const { leads, sources, stats, addLeads, updateStatus, removeLead, clearAll, upsertSource, setSourceStatus, updateSourceStats, removeSource, exportCSV } = useLeads()

const SOURCE_CONFIG: Record<SourceType, { label: string; icon: string; placeholder: string; color: string; hint: string }> = {
  telegram: { label: 'TG',   icon: 'pi-send',      placeholder: '@channel_name',                 color: 'text-blue-400',   hint: 'Public channels' },
  hh:       { label: 'hh',   icon: 'pi-briefcase', placeholder: 'веб разработка',                 color: 'text-red-400',    hint: 'Companies hiring devs' },
  fl:       { label: 'FL',   icon: 'pi-tag',       placeholder: 'создание сайта',                color: 'text-green-400',  hint: 'Freelance projects' },
  habr:     { label: 'Habr', icon: 'pi-book',      placeholder: 'стартап разработка',            color: 'text-sky-400',    hint: 'Tech companies' },
  hn:       { label: 'HN',   icon: 'pi-comments',  placeholder: 'Freelancer Seeking freelancer', color: 'text-orange-400', hint: 'Ask HN clients seeking freelancers' },
  remoteok: { label: 'ROK',  icon: 'pi-globe',     placeholder: 'react developer',               color: 'text-pink-400',   hint: 'RemoteOK job board' },
  remotive: { label: 'Rmtv', icon: 'pi-desktop',   placeholder: 'software dev',                   color: 'text-teal-400',   hint: 'Remotive remote jobs' },
  wwr:      { label: 'WWR',  icon: 'pi-server',    placeholder: 'frontend',                       color: 'text-purple-400', hint: 'We Work Remotely board' },
}

const SCRAPE_ENDPOINTS: Record<SourceType, string> = {
  telegram: '/api/scrape',
  hh: '/api/scrape-hh',
  fl: '/api/scrape-fl',
  habr: '/api/scrape-habr',
  hn: '/api/scrape-hn',
  remoteok: '/api/scrape-remoteok',
  remotive: '/api/scrape-remotive',
  wwr: '/api/scrape-wwr',
}

const newQuery = ref('')
const newSourceType = ref<SourceType>('telegram')
const search = ref('')
const filterSource = ref('')
const filterIntent = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const PAGE_SIZE = 25
const previewLead = ref<Lead | null>(null)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 4000)
}

const filteredLeads = computed(() => {
  let list = [...leads.value].sort((a, b) => b.score - a.score)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.username?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q)
    )
  }
  if (filterSource.value) list = list.filter(l => (l.sourceType ?? 'telegram') === filterSource.value)
  if (filterIntent.value) list = list.filter(l => l.intent === filterIntent.value)
  if (filterStatus.value) list = list.filter(l => l.status === filterStatus.value)
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLeads.value.length / PAGE_SIZE)))
const pagedLeads = computed(() => filteredLeads.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE))

watch(filteredLeads, () => { currentPage.value = 1 })

const statRows = computed(() => [
  { label: 'Total Leads', value: stats.value.total, color: 'text-white' },
  { label: 'High Intent', value: stats.value.highIntent, color: 'text-red-400' },
  { label: 'Contacted',   value: stats.value.contacted, color: 'text-yellow-400' },
  { label: 'Qualified',   value: stats.value.qualified, color: 'text-green-400' },
])

function handleAddSource() {
  const q = newQuery.value.trim()
  if (!q) return
  upsertSource(q, newSourceType.value)
  newQuery.value = ''
}

async function handleScrape(src: LeadSource) {
  setSourceStatus(src.id, 'scraping')
  const endpoint = SCRAPE_ENDPOINTS[src.type]
  const body = src.type === 'telegram' ? { channel: src.channel } : { query: src.channel }
  try {
    const res = await $fetch<{ leads: Lead[]; messagesScanned: number }>(endpoint, { method: 'POST', body })
    addLeads(res.leads)
    updateSourceStats(src.id, res.leads.length)
    setSourceStatus(src.id, 'idle')
    showToast(`Scanned ${res.messagesScanned} items, found ${res.leads.length} leads`)
  } catch (e: any) {
    const msg = e?.data?.message ?? e?.message ?? 'Scraping failed'
    setSourceStatus(src.id, 'error', msg)
    showToast(msg, 'error')
  }
}

async function handleScrapeAll() {
  const idle = sources.value.filter(s => s.status !== 'scraping')
  for (const src of idle) {
    await handleScrape(src)
  }
}

function intentClass(intent: string) {
  return {
    high:   'bg-red-500/20 text-red-400 border border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    low:    'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    none:   'bg-slate-700 text-slate-500 border border-slate-600',
  }[intent] ?? 'bg-slate-700 text-slate-500'
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-slate-500'
}

function scoreBarColor(score: number) {
  if (score >= 70) return 'bg-green-400'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-slate-600'
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}
</script>