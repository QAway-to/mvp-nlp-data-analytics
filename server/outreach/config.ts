import type { ScheduleConfig } from './schedule'

// Pace config for the scheduler, from env (with sane defaults). The UI may pass
// per-request overrides; persistence is the sheet itself (the written slots).
function envInt(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : NaN
  return Number.isFinite(n) ? n : fallback
}

export function getScheduleConfig(overrides: Partial<ScheduleConfig> = {}): ScheduleConfig {
  const c = useRuntimeConfig()
  return {
    perDay: overrides.perDay ?? envInt(c.outreachPerDay, 20),
    activeStartHour: overrides.activeStartHour ?? envInt(c.outreachStartHour, 10),
    activeEndHour: overrides.activeEndHour ?? envInt(c.outreachEndHour, 22),
    minGapMin: overrides.minGapMin ?? envInt(c.outreachMinGap, 12),
    jitterMin: overrides.jitterMin ?? envInt(c.outreachJitter, 7),
    tzOffsetHours: overrides.tzOffsetHours ?? 3,
  }
}
