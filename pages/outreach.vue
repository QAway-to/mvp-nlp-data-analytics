<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-white">Посев benzinradar</h1>
        <p class="text-sm text-slate-400">Очередь площадок · расписание · контроль размещений</p>
      </div>
      <div class="flex gap-2">
        <button @click="seed" :disabled="busy" class="btn-secondary">
          <i class="pi pi-download" /> Засеять 50
        </button>
        <button @click="runCheck" :disabled="busy" class="btn-secondary">
          <i class="pi pi-search" /> {{ checkLabel }}
        </button>
        <button @click="makePlan" :disabled="busy" class="btn-primary">
          <i class="pi pi-calendar" /> Сгенерировать расписание
        </button>
      </div>
    </div>

    <!-- Schedule + Due -->
    <div class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="card-title"><i class="pi pi-clock text-indigo-400" /> Шедулер</h2>
          <button @click="toggleEnabled" :disabled="busy"
            :class="schedule.enabled ? 'btn-danger' : 'btn-success'">
            <i :class="schedule.enabled ? 'pi pi-pause' : 'pi pi-play'" />
            {{ schedule.enabled ? 'Пауза' : 'Запустить отправку' }}
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label class="field"><span>В день</span><input v-model.number="schedule.perDay" type="number" min="1" max="200" /></label>
          <label class="field"><span>Часы с</span><input v-model.number="schedule.activeStartHour" type="number" min="0" max="23" /></label>
          <label class="field"><span>Часы по</span><input v-model.number="schedule.activeEndHour" type="number" min="1" max="24" /></label>
          <label class="field"><span>Пауза, мин</span><input v-model.number="schedule.minGapMin" type="number" min="1" max="720" /></label>
          <label class="field"><span>Джиттер, мин</span><input v-model.number="schedule.jitterMin" type="number" min="0" max="120" /></label>
          <label class="field"><span>TZ (UTC+)</span><input v-model.number="schedule.tzOffsetHours" type="number" min="-12" max="14" /></label>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button @click="saveSchedule" :disabled="busy" class="btn-secondary"><i class="pi pi-save" /> Сохранить настройки</button>
          <span class="text-xs" :class="schedule.enabled ? 'text-emerald-400' : 'text-slate-500'">
            {{ schedule.enabled ? `активна с ${fmt(schedule.startedAt)}` : 'на паузе' }}
          </span>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title mb-3"><i class="pi pi-send text-emerald-400" /> Сейчас к отправке</h2>
        <p v-if="paused" class="text-sm text-amber-400">Кампания на паузе — нажмите «Запустить отправку».</p>
        <p v-else-if="due.length === 0" class="text-sm text-slate-500">Нет площадок к отправке прямо сейчас.</p>
        <ul v-else class="space-y-2">
          <li v-for="d in due" :key="d.placementId" class="bg-slate-900/60 rounded-lg p-2.5 border border-white/5">
            <div class="flex items-center justify-between">
              <a :href="d.url" target="_blank" class="text-sm font-medium text-indigo-300 hover:underline">@{{ d.handle }}</a>
              <span class="text-[10px] text-slate-500">{{ d.city }}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1 line-clamp-2">{{ d.messageText }}</p>
            <div class="flex gap-1.5 mt-2">
              <button @click="markSent(d)" class="btn-mini btn-success">Отправлено</button>
              <button @click="skip(d)" class="btn-mini btn-secondary">Пропустить</button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-6 gap-3">
      <div v-for="s in statCards" :key="s.label" class="card text-center py-3">
        <div class="text-2xl font-bold" :class="s.color">{{ s.value }}</div>
        <div class="text-[11px] text-slate-500">{{ s.label }}</div>
      </div>
    </div>

    <!-- Queue -->
    <div class="card overflow-x-auto">
      <h2 class="card-title mb-3"><i class="pi pi-list text-indigo-400" /> Очередь ({{ queue.length }})</h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[11px] uppercase text-slate-500 border-b border-white/10">
            <th class="py-2 pr-2">Площадка</th>
            <th class="px-2">Город</th>
            <th class="px-2">Вердикт</th>
            <th class="px-2">Активность</th>
            <th class="px-2">Слот (MSK)</th>
            <th class="px-2">Статус</th>
            <th class="px-2 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in queue" :key="r.targetId" class="border-b border-white/5 hover:bg-white/5">
            <td class="py-2 pr-2">
              <a :href="r.url" target="_blank" class="text-indigo-300 hover:underline font-medium">@{{ r.handle }}</a>
              <div class="text-[10px] text-slate-500 truncate max-w-[180px]">{{ r.title }}</div>
            </td>
            <td class="px-2 text-slate-400 whitespace-nowrap">{{ r.city }}</td>
            <td class="px-2"><span :class="recBadge(r.recommendation)">{{ recLabel(r.recommendation) }}</span></td>
            <td class="px-2 text-slate-400">{{ r.activity ?? '—' }}<span v-if="r.online" class="text-[10px] text-slate-600"> · {{ r.online }} on</span></td>
            <td class="px-2 text-slate-400 whitespace-nowrap text-[11px]">{{ r.scheduledAt ? fmt(r.scheduledAt) : '—' }}</td>
            <td class="px-2"><span :class="stateBadge(r.state)">{{ r.state ?? '—' }}</span></td>
            <td class="px-2">
              <div class="flex gap-1 justify-end">
                <a :href="r.url" target="_blank" class="btn-mini btn-secondary" title="Открыть в TG"><i class="pi pi-external-link" /></a>
                <button v-if="canSend(r)" @click="markSent(r)" class="btn-mini btn-success" title="Отметить отправку"><i class="pi pi-check" /></button>
                <button v-if="r.messageUrl" @click="verify(r)" class="btn-mini btn-secondary" title="Проверить, не удалено"><i class="pi pi-refresh" /></button>
                <button v-if="r.placementId && r.state !== 'skipped'" @click="skip(r)" class="btn-mini btn-secondary" title="Пропустить"><i class="pi pi-ban" /></button>
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
import type { QueueRow, ScheduleSettings, Recommendation, PlacementState } from '~/types/outreach'

const queue = ref<QueueRow[]>([])
const due = ref<QueueRow[]>([])
const paused = ref(true)
const busy = ref(false)
const toast = ref('')
const checkLabel = ref('Проверить площадки')

const schedule = ref<ScheduleSettings>({
  perDay: 20, activeStartHour: 10, activeEndHour: 22,
  minGapMin: 12, jitterMin: 7, tzOffsetHours: 3, enabled: false, startedAt: null,
})

function flash(msg: string) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = '' }, 3500) }

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(new Date(iso).getTime() + schedule.value.tzOffsetHours * 3_600_000)
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

async function refreshAll() {
  const [t, s, d] = await Promise.all([
    $fetch<{ data: QueueRow[] }>('/api/outreach/targets'),
    $fetch<{ data: ScheduleSettings }>('/api/outreach/schedule'),
    $fetch<{ data: QueueRow[]; paused: boolean }>('/api/outreach/due'),
  ])
  queue.value = t.data
  schedule.value = s.data
  due.value = d.data
  paused.value = d.paused
}

async function withBusy(fn: () => Promise<void>) {
  busy.value = true
  try { await fn() } catch (e: unknown) { flash(e instanceof Error ? e.message : 'Ошибка') } finally { busy.value = false }
}

const seed = () => withBusy(async () => {
  const r = await $fetch<{ inserted: number }>('/api/outreach/seed', { method: 'POST' })
  flash(`Добавлено площадок: ${r.inserted}`)
  await refreshAll()
})

const runCheck = () => withBusy(async () => {
  let remaining = 1
  let total = 0
  while (remaining > 0) {
    const r = await $fetch<{ checked: number; remaining: number }>('/api/outreach/check', { method: 'POST', body: { limit: 8, onlyUnchecked: true } })
    total += r.checked
    remaining = r.remaining
    checkLabel.value = `Проверка… осталось ${remaining}`
    if (r.checked === 0) break
    await refreshAll()
  }
  checkLabel.value = 'Проверить площадки'
  flash(`Проверено: ${total}`)
  await refreshAll()
})

const makePlan = () => withBusy(async () => {
  const r = await $fetch<{ planned: number; note?: string }>('/api/outreach/plan', { method: 'POST' })
  flash(r.note ?? `Запланировано размещений: ${r.planned}`)
  await refreshAll()
})

const saveSchedule = () => withBusy(async () => {
  const s = schedule.value
  await $fetch('/api/outreach/schedule', { method: 'POST', body: {
    perDay: s.perDay, activeStartHour: s.activeStartHour, activeEndHour: s.activeEndHour,
    minGapMin: s.minGapMin, jitterMin: s.jitterMin, tzOffsetHours: s.tzOffsetHours,
  } })
  flash('Настройки сохранены')
  await refreshAll()
})

const toggleEnabled = () => withBusy(async () => {
  await $fetch('/api/outreach/schedule', { method: 'POST', body: { enabled: !schedule.value.enabled } })
  await refreshAll()
})

const markSent = (r: QueueRow) => withBusy(async () => {
  if (!r.placementId) { flash('Сначала сгенерируйте расписание'); return }
  const url = window.prompt('Ссылка на размещённое сообщение (t.me/<chat>/<id>). Пусто — если ссылки нет:')
  if (url === null) return
  let screenshotUrl: string | undefined
  if (!url.trim()) {
    const sc = window.prompt('Ссылки нет — вставьте ссылку на скриншот в Google Drive:')
    if (sc === null) return
    screenshotUrl = sc.trim() || undefined
  }
  const res = await $fetch<{ state: string; verifyState: string | null }>('/api/outreach/mark', { method: 'POST', body: {
    placementId: r.placementId, state: 'sent', messageUrl: url.trim() || undefined, screenshotUrl,
  } })
  flash(res.verifyState === 'deleted' ? '⚠️ Сообщение удалено в чате!' : res.state === 'verified' ? '✅ Отправлено и подтверждено' : 'Отмечено')
  await refreshAll()
})

const skip = (r: QueueRow) => withBusy(async () => {
  if (!r.placementId) return
  const note = window.prompt('Причина пропуска (необязательно):') ?? undefined
  await $fetch('/api/outreach/mark', { method: 'POST', body: { placementId: r.placementId, state: 'skipped', note } })
  await refreshAll()
})

const verify = (r: QueueRow) => withBusy(async () => {
  if (!r.messageUrl || !r.placementId) return
  const v = await $fetch<{ data: { state: string } }>('/api/verify-message', { method: 'POST', body: { url: r.messageUrl } })
  if (v.data.state === 'deleted') {
    await $fetch('/api/outreach/mark', { method: 'POST', body: { placementId: r.placementId, state: 'deleted' } })
    flash('⚠️ Удалено — отмечено')
  } else if (v.data.state === 'alive') {
    await $fetch('/api/outreach/mark', { method: 'POST', body: { placementId: r.placementId, state: 'verified', messageUrl: r.messageUrl } })
    flash('✅ На месте')
  } else flash('Не удалось проверить публично — оставьте скриншот')
  await refreshAll()
})

function canSend(r: QueueRow): boolean {
  return !!r.placementId && (r.state === 'scheduled' || r.state === 'pending' || r.state === 'failed')
}

const recLabel = (r: Recommendation | null) => r === 'go' ? 'go' : r === 'caution' ? 'caution' : r === 'skip' ? 'skip' : 'не пров.'
const recBadge = (r: Recommendation | null) => 'badge ' + (r === 'go' ? 'bg-emerald-500/15 text-emerald-300' : r === 'caution' ? 'bg-amber-500/15 text-amber-300' : r === 'skip' ? 'bg-red-500/15 text-red-300' : 'bg-slate-600/20 text-slate-400')
const stateBadge = (s: PlacementState | null) => 'badge ' + (s === 'verified' ? 'bg-emerald-500/15 text-emerald-300' : s === 'sent' ? 'bg-indigo-500/15 text-indigo-300' : s === 'scheduled' ? 'bg-sky-500/15 text-sky-300' : s === 'deleted' || s === 'failed' ? 'bg-red-500/15 text-red-300' : s === 'skipped' ? 'bg-slate-600/20 text-slate-400' : 'bg-slate-700/20 text-slate-500')

const statCards = computed(() => {
  const by = (pred: (r: QueueRow) => boolean) => queue.value.filter(pred).length
  return [
    { label: 'всего', value: queue.value.length, color: 'text-white' },
    { label: 'go', value: by(r => r.recommendation === 'go'), color: 'text-emerald-400' },
    { label: 'caution', value: by(r => r.recommendation === 'caution'), color: 'text-amber-400' },
    { label: 'запланировано', value: by(r => r.state === 'scheduled'), color: 'text-sky-400' },
    { label: 'размещено', value: by(r => r.state === 'sent' || r.state === 'verified'), color: 'text-indigo-400' },
    { label: 'удалено', value: by(r => r.state === 'deleted'), color: 'text-red-400' },
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
.btn-danger { @apply bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50; }
.btn-mini { @apply text-[11px] rounded-md px-2 py-1 font-medium transition-colors; }
</style>
