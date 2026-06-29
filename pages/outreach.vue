<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-white">Посев benzinradar</h1>
        <p class="text-sm text-slate-400">Таблица — база · поиск · проверка · расписание · контроль</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button @click="seed" :disabled="busy" class="btn-secondary"><i class="pi pi-download" /> Засеять</button>
        <button @click="runCheck" :disabled="busy" class="btn-secondary"><i class="pi pi-search" /> {{ checkLabel }}</button>
        <button @click="makePlan" :disabled="busy" class="btn-primary"><i class="pi pi-calendar" /> Расписание</button>
        <button @click="verifyAll" :disabled="busy" class="btn-secondary"><i class="pi pi-refresh" /> Перепроверить</button>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 card">
        <h2 class="card-title mb-3"><i class="pi pi-clock text-indigo-400" /> Темп (20/день, человеческие часы)</h2>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <label class="field"><span>В день</span><input v-model.number="cfg.perDay" type="number" min="1" max="200" /></label>
          <label class="field"><span>Часы с</span><input v-model.number="cfg.activeStartHour" type="number" min="0" max="23" /></label>
          <label class="field"><span>Часы по</span><input v-model.number="cfg.activeEndHour" type="number" min="1" max="24" /></label>
          <label class="field"><span>Пауза, мин</span><input v-model.number="cfg.minGapMin" type="number" min="1" max="720" /></label>
          <label class="field"><span>Джиттер, мин</span><input v-model.number="cfg.jitterMin" type="number" min="0" max="120" /></label>
        </div>
        <p class="text-[11px] text-slate-500 mt-2">Значения применяются при «Расписание». Слоты пишутся прямо в таблицу (колонка O).</p>
      </div>

      <div class="card">
        <h2 class="card-title mb-3"><i class="pi pi-send text-emerald-400" /> Сейчас к отправке</h2>
        <p v-if="due.length === 0" class="text-sm text-slate-500">Нет площадок к отправке прямо сейчас.</p>
        <ul v-else class="space-y-2">
          <li v-for="d in due" :key="d.row" class="bg-slate-900/60 rounded-lg p-2.5 border border-white/5">
            <div class="flex items-center justify-between">
              <a :href="d.chatUrlFull" target="_blank" class="text-sm font-medium text-indigo-300 hover:underline">@{{ d.handle }}</a>
              <span class="text-[10px] text-slate-500">{{ d.city }}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1 line-clamp-3">{{ variantText(d.variant) }}</p>
            <div class="flex gap-1.5 mt-2">
              <button @click="copyText" :disabled="copying" class="btn-mini btn-secondary"><i class="pi pi-copy" /> {{ copying ? '…' : 'Текст' }}</button>
              <button @click="markSent(d)" class="btn-mini btn-success">Отправлено</button>
              <button @click="skip(d)" class="btn-mini btn-secondary">Пропустить</button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-6 gap-3">
      <div v-for="s in statCards" :key="s.label" class="card text-center py-3">
        <div class="text-2xl font-bold" :class="s.color">{{ s.value }}</div>
        <div class="text-[11px] text-slate-500">{{ s.label }}</div>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <h2 class="card-title mb-3"><i class="pi pi-list text-indigo-400" /> Очередь ({{ queue.length }})</h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[11px] uppercase text-slate-500 border-b border-white/10">
            <th class="py-2 pr-2">Площадка</th><th class="px-2">Город</th><th class="px-2">Вердикт</th>
            <th class="px-2">Активн.</th><th class="px-2">Слот (MSK)</th><th class="px-2">Статус</th><th class="px-2 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in queue" :key="r.row" class="border-b border-white/5 hover:bg-white/5">
            <td class="py-2 pr-2">
              <a :href="r.chatUrlFull" target="_blank" class="text-indigo-300 hover:underline font-medium">@{{ r.handle }}</a>
              <div class="text-[10px] text-slate-500 truncate max-w-[180px]">{{ r.title }}</div>
            </td>
            <td class="px-2 text-slate-400 whitespace-nowrap">{{ r.city }}</td>
            <td class="px-2"><span :class="verdictBadge(r.verdict)">{{ r.verdict || '—' }}</span></td>
            <td class="px-2 text-slate-400">{{ r.activity || '—' }}<span v-if="r.online" class="text-[10px] text-slate-600"> · {{ r.online }} on</span></td>
            <td class="px-2 text-slate-400 whitespace-nowrap text-[11px]">{{ r.slot ? fmt(r.slot) : '—' }}</td>
            <td class="px-2"><span :class="statusBadge(r.status)">{{ r.status || '—' }}</span></td>
            <td class="px-2">
              <div class="flex gap-1 justify-end">
                <a :href="r.chatUrlFull" target="_blank" class="btn-mini btn-secondary" title="Открыть в TG"><i class="pi pi-external-link" /></a>
                <button v-if="canSend(r)" @click="copyText" :disabled="copying" class="btn-mini btn-secondary" title="Сгенерировать и скопировать свежий текст"><i class="pi pi-copy" /></button>
                <button v-if="canSend(r)" @click="markSent(r)" class="btn-mini btn-success" title="Отметить отправку"><i class="pi pi-check" /></button>
                <button v-if="canSend(r)" @click="skip(r)" class="btn-mini btn-secondary" title="Пропустить"><i class="pi pi-ban" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="toast" class="fixed bottom-4 right-4 bg-slate-800 border border-white/10 text-sm text-white px-4 py-2 rounded-lg shadow-xl">{{ toast }}</p>
  </div>
</template>

<script setup lang="ts">
interface Row {
  row: number; handle: string; city: string; category: string; title: string
  members: string; variant: string; postedDate: string; messageUrl: string
  status: string; verifiedAt: string; verdict: string; reason: string; slot: string; online: string; activity: string
  chatUrlFull?: string
}
interface Cfg { perDay: number; activeStartHour: number; activeEndHour: number; minGapMin: number; jitterMin: number; tzOffsetHours: number }

const VARIANTS = [
  'Если пригодится: нашёл карту, где люди отмечают наличие топлива на АЗС. Можно быстро глянуть и при желании добавить свою отметку. https://benzinradar.com',
  'Нашёл карту наличия бензина на АЗС. Если кто-то сегодня заправлялся — можно отметить свою заправку, чтобы другим было проще ориентироваться. https://benzinradar.com',
  'Тут можно посмотреть наличие топлива на АЗС — карта пополняется самими водителями, чем больше отметок, тем точнее. https://benzinradar.com',
]
function variantText(v: string): string {
  const n = parseInt((v || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n >= 1 && n <= 3 ? VARIANTS[n - 1] : VARIANTS[0]
}

const queue = ref<Row[]>([])
const due = ref<Row[]>([])
const busy = ref(false)
const copying = ref(false)
const toast = ref('')
const checkLabel = ref('Проверить')
const cfg = ref<Cfg>({ perDay: 20, activeStartHour: 10, activeEndHour: 22, minGapMin: 12, jitterMin: 7, tzOffsetHours: 3 })

function flash(m: string) { toast.value = m; setTimeout(() => { if (toast.value === m) toast.value = '' }, 3500) }
function withUrl(r: Row): Row { return { ...r, chatUrlFull: `https://t.me/${r.handle}` } }
function fmt(iso: string): string {
  const t = Date.parse(iso); if (Number.isNaN(t)) return iso
  return new Date(t + cfg.value.tzOffsetHours * 3_600_000).toISOString().slice(0, 16).replace('T', ' ')
}

// Sheets-backed endpoints (targets/due) can hang on a cold Render start while
// the first Google auth/read warms up. Bound each request with a timeout and
// retry so a stuck call aborts and re-fires instead of blocking the load
// forever — which is what left the UI stuck on zeros.
const FETCH_OPTS = { retry: 4, retryDelay: 1_000, timeout: 15_000 } as const

async function refreshAll() {
  // allSettled, not all: one slow/failed endpoint must not blank the others.
  const [t, s, d] = await Promise.allSettled([
    $fetch<{ data: Row[] }>('/api/outreach/targets', FETCH_OPTS),
    $fetch<{ data: Cfg }>('/api/outreach/schedule', FETCH_OPTS),
    $fetch<{ data: Row[] }>('/api/outreach/due', FETCH_OPTS),
  ])
  if (t.status === 'fulfilled') queue.value = t.value.data.map(withUrl)
  if (s.status === 'fulfilled') cfg.value = s.value.data
  if (d.status === 'fulfilled') due.value = d.value.data.map(withUrl)

  const failed = [t, s, d].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
  if (failed) {
    throw failed.reason instanceof Error ? failed.reason : new Error('Не удалось загрузить данные')
  }
}

async function run(fn: () => Promise<void>) {
  busy.value = true
  try { await fn() } catch (e: unknown) { flash(e instanceof Error ? e.message : 'Ошибка') } finally { busy.value = false }
}

const seed = () => run(async () => {
  const r = await $fetch<{ inserted: number }>('/api/outreach/seed', { method: 'POST' })
  flash(`Добавлено: ${r.inserted}`); await refreshAll()
})

const runCheck = () => run(async () => {
  let remaining = 1, total = 0
  while (remaining > 0) {
    const r = await $fetch<{ checked: number; remaining: number }>('/api/outreach/check', { method: 'POST', body: { limit: 8 } })
    total += r.checked; remaining = r.remaining
    checkLabel.value = `Проверка… ${remaining}`
    if (r.checked === 0) break
    await refreshAll()
  }
  checkLabel.value = 'Проверить'; flash(`Проверено: ${total}`); await refreshAll()
})

const makePlan = () => run(async () => {
  const r = await $fetch<{ planned: number; note?: string }>('/api/outreach/plan', { method: 'POST', body: cfg.value })
  flash(r.note ?? `Запланировано: ${r.planned}`); await refreshAll()
})

const verifyAll = () => run(async () => {
  const r = await $fetch<{ checked: number; deleted: number }>('/api/outreach/verify-due')
  flash(`Перепроверено: ${r.checked}, удалено: ${r.deleted}`); await refreshAll()
})

const markSent = (r: Row) => run(async () => {
  const url = window.prompt('Ссылка на размещённое сообщение (t.me/<chat>/<id>). Пусто — если ссылки нет:')
  if (url === null) return
  let screenshotUrl: string | undefined
  if (!url.trim()) {
    const sc = window.prompt('Ссылки нет — ссылка на скриншот в Google Drive:')
    if (sc === null) return
    screenshotUrl = sc.trim() || undefined
  }
  const res = await $fetch<{ status: string; verifyState: string | null }>('/api/outreach/mark', { method: 'POST', body: {
    row: r.row, status: 'размещено', messageUrl: url.trim() || undefined, screenshotUrl,
  } })
  flash(res.verifyState === 'deleted' ? '⚠️ Удалено в чате!' : res.status === 'проверено' ? '✅ Отправлено и подтверждено' : 'Отмечено')
  await refreshAll()
})

const skip = (r: Row) => run(async () => {
  await $fetch('/api/outreach/mark', { method: 'POST', body: { row: r.row, status: 'пропущено' } })
  await refreshAll()
})

// Generate a fresh LLM variation and drop it straight into the clipboard — the
// operator pastes into Telegram without ever needing to read/retype it.
async function copyText() {
  if (copying.value) return
  copying.value = true
  try {
    const { text } = await $fetch<{ text: string }>('/api/outreach/gen-text', { method: 'POST' })
    try {
      await navigator.clipboard.writeText(text)
      flash('Текст скопирован ✓ — вставляй в чат')
    } catch {
      // Clipboard blocked (focus/permissions) → surface so it can be copied by hand.
      window.prompt('Скопируй текст вручную (Ctrl+C):', text)
    }
  } catch {
    flash('Не удалось сгенерировать текст')
  } finally {
    copying.value = false
  }
}

const DONE = ['размещено', 'проверено', 'удалено', 'skip', 'пропущено']
function canSend(r: Row): boolean {
  const v = r.verdict.toUpperCase()
  return (v === 'GO' || v === 'CAUTION') && !DONE.includes(r.status.toLowerCase()) && !r.messageUrl
}

const verdictBadge = (v: string) => 'badge ' + (v === 'GO' ? 'bg-emerald-500/15 text-emerald-300' : v === 'CAUTION' ? 'bg-amber-500/15 text-amber-300' : v === 'SKIP' ? 'bg-red-500/15 text-red-300' : 'bg-slate-600/20 text-slate-400')
const statusBadge = (s: string) => { const x = s.toLowerCase(); return 'badge ' + (x === 'проверено' ? 'bg-emerald-500/15 text-emerald-300' : x === 'размещено' ? 'bg-indigo-500/15 text-indigo-300' : x === 'запланировано' ? 'bg-sky-500/15 text-sky-300' : x === 'удалено' ? 'bg-red-500/15 text-red-300' : x === 'пропущено' || x === 'skip' ? 'bg-slate-600/20 text-slate-400' : 'bg-slate-700/20 text-slate-500') }

const statCards = computed(() => {
  const by = (p: (r: Row) => boolean) => queue.value.filter(p).length
  return [
    { label: 'всего', value: queue.value.length, color: 'text-white' },
    { label: 'GO', value: by(r => r.verdict.toUpperCase() === 'GO'), color: 'text-emerald-400' },
    { label: 'CAUTION', value: by(r => r.verdict.toUpperCase() === 'CAUTION'), color: 'text-amber-400' },
    { label: 'запланировано', value: by(r => r.status.toLowerCase() === 'запланировано'), color: 'text-sky-400' },
    { label: 'размещено', value: by(r => ['размещено', 'проверено'].includes(r.status.toLowerCase())), color: 'text-indigo-400' },
    { label: 'удалено', value: by(r => r.status.toLowerCase() === 'удалено'), color: 'text-red-400' },
  ]
})

onMounted(() => { refreshAll().catch((e) => flash(e instanceof Error ? e.message : 'Ошибка загрузки')) })
</script>

<style scoped>
.card { @apply bg-slate-800/60 rounded-2xl border border-white/10 p-4; }
.card-title { @apply text-sm font-bold text-white flex items-center gap-2; }
.field { @apply flex flex-col gap-1 text-[11px] text-slate-400; }
.field input { @apply bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500; }
.badge { @apply text-[10px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap; }
.btn-primary { @apply bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed; }
.btn-secondary { @apply bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50; }
.btn-success { @apply bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50; }
.btn-mini { @apply text-[11px] rounded-md px-2 py-1 font-medium transition-colors; }
</style>
