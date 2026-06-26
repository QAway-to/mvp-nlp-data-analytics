import { query } from '../client'
import { TARGET_SEEDS } from '~/server/outreach/targets.seed'
import type { ChatAssessment } from '~/server/utils/assessChat'
import type { ScheduleSettings, QueueRow, PlacementState } from '~/types/outreach'

// Data access for the benzinradar outreach queue. Targets are the communities;
// placements are the (one-per-community) send records the operator/worker drives.

export async function seedTargets(): Promise<{ inserted: number }> {
  let inserted = 0
  for (const t of TARGET_SEEDS) {
    const res = await query(
      `INSERT INTO outreach_targets (handle, title, city, category, members)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (handle) DO NOTHING`,
      [t.handle, t.title, t.city, t.category, t.members],
    )
    inserted += res.rowCount ?? 0
  }
  return { inserted }
}

// Handles still needing (or due for re-)assessment, oldest first.
export async function listHandlesToCheck(limit: number, onlyUnchecked: boolean): Promise<string[]> {
  const where = onlyUnchecked ? 'WHERE last_checked_at IS NULL' : ''
  const { rows } = await query<{ handle: string }>(
    `SELECT handle FROM outreach_targets ${where}
     ORDER BY last_checked_at ASC NULLS FIRST, id ASC LIMIT $1`,
    [limit],
  )
  return rows.map((r) => r.handle)
}

export async function countUnchecked(): Promise<number> {
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM outreach_targets WHERE last_checked_at IS NULL`,
  )
  return Number(rows[0]?.n ?? 0)
}

// Persist a fresh check-chat assessment onto the target row.
export async function saveAssessment(a: ChatAssessment): Promise<void> {
  await query(
    `UPDATE outreach_targets
     SET kind = $2, activity = $3, ad_policy = $4, recommendation = $5,
         reasons = $6, members = COALESCE($7, members), online = $8, last_checked_at = $9
     WHERE handle = $1`,
    [a.handle, a.kind, a.activity, a.adPolicy, a.recommendation,
     a.reasons.join('; '), a.members, a.online, a.checkedAt],
  )
}

interface QueueRowRaw {
  target_id: number
  handle: string
  title: string | null
  city: string | null
  category: string | null
  members: number | null
  online: number | null
  kind: string | null
  activity: string | null
  ad_policy: string | null
  recommendation: string | null
  reasons: string | null
  last_checked_at: string | null
  enabled: boolean
  placement_id: number | null
  variant: number | null
  message_text: string | null
  scheduled_at: string | null
  sent_at: string | null
  message_url: string | null
  screenshot_url: string | null
  state: string | null
  verified_at: string | null
  note: string | null
}

function toQueueRow(r: QueueRowRaw): QueueRow {
  return {
    targetId: r.target_id,
    handle: r.handle,
    url: `https://t.me/${r.handle}`,
    title: r.title,
    city: r.city,
    category: r.category,
    members: r.members,
    online: r.online,
    kind: r.kind,
    activity: r.activity,
    adPolicy: r.ad_policy,
    recommendation: r.recommendation as QueueRow['recommendation'],
    reasons: r.reasons,
    lastCheckedAt: r.last_checked_at,
    enabled: r.enabled,
    placementId: r.placement_id,
    variant: r.variant,
    messageText: r.message_text,
    scheduledAt: r.scheduled_at,
    sentAt: r.sent_at,
    messageUrl: r.message_url,
    screenshotUrl: r.screenshot_url,
    state: r.state as PlacementState | null,
    verifiedAt: r.verified_at,
    note: r.note,
  }
}

export async function listQueue(): Promise<QueueRow[]> {
  const { rows } = await query<QueueRowRaw>(
    `SELECT t.id AS target_id, t.handle, t.title, t.city, t.category, t.members, t.online,
            t.kind, t.activity, t.ad_policy, t.recommendation, t.reasons, t.last_checked_at, t.enabled,
            p.id AS placement_id, p.variant, p.message_text, p.scheduled_at, p.sent_at,
            p.message_url, p.screenshot_url, p.state, p.verified_at, p.note
     FROM outreach_targets t
     LEFT JOIN outreach_placements p ON p.target_id = t.id
     ORDER BY p.scheduled_at ASC NULLS LAST, t.id ASC`,
  )
  return rows.map(toQueueRow)
}

// Targets eligible to be scheduled: enabled, assessed, not 'skip', not already sent.
export async function listSchedulableTargetIds(): Promise<number[]> {
  const { rows } = await query<{ id: number }>(
    `SELECT t.id
     FROM outreach_targets t
     LEFT JOIN outreach_placements p ON p.target_id = t.id
     WHERE t.enabled = TRUE
       AND t.recommendation IN ('go','caution')
       AND (p.id IS NULL OR p.state IN ('pending','scheduled'))
     ORDER BY CASE t.recommendation WHEN 'go' THEN 0 ELSE 1 END,
              COALESCE(t.online, 0) DESC, t.id ASC`,
  )
  return rows.map((r) => r.id)
}

// Upsert a planned placement (idempotent on target_id — never double-posts).
// Returns true only if a row was actually written: the ON CONFLICT guard makes
// it a no-op when a placement is already sent/verified/deleted/skipped/failed.
export async function upsertPlacement(
  targetId: number, variant: number, messageText: string, scheduledAt: string,
): Promise<boolean> {
  const res = await query(
    `INSERT INTO outreach_placements (target_id, variant, message_text, scheduled_at, state, updated_at)
     VALUES ($1, $2, $3, $4, 'scheduled', now())
     ON CONFLICT (target_id) DO UPDATE
       SET variant = EXCLUDED.variant, message_text = EXCLUDED.message_text,
           scheduled_at = EXCLUDED.scheduled_at, state = 'scheduled', updated_at = now()
     WHERE outreach_placements.state IN ('pending','scheduled')`,
    [targetId, variant, messageText, scheduledAt],
  )
  return (res.rowCount ?? 0) > 0
}

export async function getDuePlacements(now: string, limit: number): Promise<QueueRow[]> {
  const { rows } = await query<QueueRowRaw>(
    `SELECT t.id AS target_id, t.handle, t.title, t.city, t.category, t.members, t.online,
            t.kind, t.activity, t.ad_policy, t.recommendation, t.reasons, t.last_checked_at, t.enabled,
            p.id AS placement_id, p.variant, p.message_text, p.scheduled_at, p.sent_at,
            p.message_url, p.screenshot_url, p.state, p.verified_at, p.note
     FROM outreach_placements p
     JOIN outreach_targets t ON t.id = p.target_id
     WHERE p.state = 'scheduled' AND p.scheduled_at <= $1
     ORDER BY p.scheduled_at ASC
     LIMIT $2`,
    [now, limit],
  )
  return rows.map(toQueueRow)
}

export interface MarkInput {
  state: PlacementState
  messageUrl?: string | null
  screenshotUrl?: string | null
  note?: string | null
  verifiedAt?: string | null
}

export async function markPlacement(placementId: number, input: MarkInput): Promise<void> {
  const sentAtClause = input.state === 'sent' ? ', sent_at = COALESCE(sent_at, now())' : ''
  await query(
    `UPDATE outreach_placements
     SET state = $2, message_url = COALESCE($3, message_url),
         screenshot_url = COALESCE($4, screenshot_url), note = COALESCE($5, note),
         verified_at = COALESCE($6::timestamptz, verified_at), updated_at = now()${sentAtClause}
     WHERE id = $1`,
    [placementId, input.state, input.messageUrl ?? null, input.screenshotUrl ?? null,
     input.note ?? null, input.verifiedAt ?? null],
  )
}

interface ScheduleRaw {
  per_day: number
  active_start_hour: number
  active_end_hour: number
  min_gap_min: number
  jitter_min: number
  tz_offset_hours: number
  enabled: boolean
  started_at: string | null
}

function toSettings(r: ScheduleRaw): ScheduleSettings {
  return {
    perDay: r.per_day,
    activeStartHour: r.active_start_hour,
    activeEndHour: r.active_end_hour,
    minGapMin: r.min_gap_min,
    jitterMin: r.jitter_min,
    tzOffsetHours: r.tz_offset_hours,
    enabled: r.enabled,
    startedAt: r.started_at,
  }
}

export async function getSchedule(): Promise<ScheduleSettings> {
  const { rows } = await query<ScheduleRaw>(`SELECT * FROM outreach_schedule WHERE id = 1`)
  if (rows.length === 0) throw new Error('outreach_schedule not initialised — run migrations')
  return toSettings(rows[0])
}

export async function updateSchedule(s: Partial<ScheduleSettings>): Promise<ScheduleSettings> {
  const { rows } = await query<ScheduleRaw>(
    `UPDATE outreach_schedule SET
       per_day = COALESCE($1, per_day),
       active_start_hour = COALESCE($2, active_start_hour),
       active_end_hour = COALESCE($3, active_end_hour),
       min_gap_min = COALESCE($4, min_gap_min),
       jitter_min = COALESCE($5, jitter_min),
       tz_offset_hours = COALESCE($6, tz_offset_hours),
       enabled = COALESCE($7, enabled),
       started_at = CASE WHEN $7 = TRUE AND started_at IS NULL THEN now() ELSE started_at END,
       updated_at = now()
     WHERE id = 1
     RETURNING *`,
    [s.perDay ?? null, s.activeStartHour ?? null, s.activeEndHour ?? null,
     s.minGapMin ?? null, s.jitterMin ?? null, s.tzOffsetHours ?? null,
     s.enabled ?? null],
  )
  return toSettings(rows[0])
}
