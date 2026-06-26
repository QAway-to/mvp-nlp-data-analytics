// Pure scheduler: turns a pace config into concrete send timestamps that look
// human — capped per day, only inside active ("human") hours, spaced by a minimum
// gap plus random jitter. No DB, no IO → unit-testable. The worker/operator then
// sends each placement at (or after) its slot.

export interface ScheduleConfig {
  perDay: number            // e.g. 20
  activeStartHour: number   // local hour [0..23], inclusive — e.g. 10
  activeEndHour: number     // local hour [0..23], exclusive — e.g. 22
  minGapMin: number         // hard floor between two sends, minutes
  jitterMin: number         // ± random minutes added to each slot
  tzOffsetHours: number     // target wall-clock offset from UTC (MSK = 3)
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  perDay: 20,
  activeStartHour: 10,
  activeEndHour: 22,
  minGapMin: 12,
  jitterMin: 7,
  tzOffsetHours: 3,
}

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

// Minutes-of-day in the target tz for a UTC epoch ms.
function localMinutes(utcMs: number, tzOffsetHours: number): number {
  const local = new Date(utcMs + tzOffsetHours * HOUR)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

// Start of the active window on the same local day as `utcMs` (as UTC epoch ms).
function windowStartFor(utcMs: number, cfg: ScheduleConfig): number {
  const local = new Date(utcMs + cfg.tzOffsetHours * HOUR)
  local.setUTCHours(cfg.activeStartHour, 0, 0, 0)
  return local.getTime() - cfg.tzOffsetHours * HOUR
}

function clampConfig(cfg: ScheduleConfig): ScheduleConfig {
  const perDay = Math.max(1, Math.min(200, Math.floor(cfg.perDay)))
  const start = Math.max(0, Math.min(23, Math.floor(cfg.activeStartHour)))
  const end = Math.max(start + 1, Math.min(24, Math.floor(cfg.activeEndHour)))
  const windowMinutes = (end - start) * 60
  return {
    perDay,
    activeStartHour: start,
    activeEndHour: end,
    minGapMin: Math.max(1, Math.min(Math.floor(cfg.minGapMin), windowMinutes)),
    // Jitter must stay below the window, else every slot overflows and the loop
    // would advance days forever without placing a single send.
    jitterMin: Math.max(0, Math.min(Math.floor(cfg.jitterMin), windowMinutes - 1)),
    tzOffsetHours: cfg.tzOffsetHours,
  }
}

// Generate `count` send timestamps (ISO strings) starting no earlier than `from`.
export function generateSlots(
  rawCfg: ScheduleConfig,
  count: number,
  from: Date = new Date(),
  rng: () => number = Math.random,
): string[] {
  const cfg = clampConfig(rawCfg)
  if (count <= 0) return []

  const windowMinutes = (cfg.activeEndHour - cfg.activeStartHour) * 60
  const baseSpacing = Math.max(cfg.minGapMin, Math.floor(windowMinutes / cfg.perDay))

  const slots: string[] = []
  let cursor = from.getTime()
  let postedToday = 0
  let dayKey = -1

  // Advance the cursor into the next valid active window if it's outside one.
  const intoWindow = (ms: number): number => {
    const mins = localMinutes(ms, cfg.tzOffsetHours)
    const startMins = cfg.activeStartHour * 60
    const endMins = cfg.activeEndHour * 60
    if (mins < startMins) return windowStartFor(ms, cfg)
    if (mins >= endMins) return windowStartFor(ms + DAY, cfg)
    return ms
  }

  cursor = intoWindow(cursor)

  while (slots.length < count) {
    const localDay = Math.floor((cursor + cfg.tzOffsetHours * HOUR) / DAY)
    if (localDay !== dayKey) { dayKey = localDay; postedToday = 0 }

    if (postedToday >= cfg.perDay) {
      cursor = windowStartFor(cursor + DAY, cfg) // next day's window, no slot consumed
      continue
    }

    // Jitter only delays (0..jitterMin) so the minimum gap is never violated.
    const jitter = Math.round(rng() * cfg.jitterMin) * MIN
    const slot = cursor + jitter

    // Jitter must not push the send past the active window's end.
    if (localMinutes(slot, cfg.tzOffsetHours) >= cfg.activeEndHour * 60) {
      cursor = windowStartFor(cursor + DAY, cfg)
      continue
    }

    slots.push(new Date(slot).toISOString())
    postedToday++

    cursor = intoWindow(slot + baseSpacing * MIN)
  }

  return slots
}
