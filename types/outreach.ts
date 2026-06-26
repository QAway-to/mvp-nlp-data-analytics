// Shared outreach contracts (client + server). No server-only imports.

export type Recommendation = 'go' | 'caution' | 'skip'
export type PlacementState = 'pending' | 'scheduled' | 'sent' | 'verified' | 'deleted' | 'skipped' | 'failed'

export interface ScheduleSettings {
  perDay: number
  activeStartHour: number
  activeEndHour: number
  minGapMin: number
  jitterMin: number
  tzOffsetHours: number
  enabled: boolean
  startedAt: string | null
}

// One row of the operator queue: a target plus its (optional) placement.
export interface QueueRow {
  targetId: number
  handle: string
  url: string
  title: string | null
  city: string | null
  category: string | null
  members: number | null
  online: number | null
  kind: string | null
  activity: string | null
  adPolicy: string | null
  recommendation: Recommendation | null
  reasons: string | null
  lastCheckedAt: string | null
  enabled: boolean
  // placement (null until planned)
  placementId: number | null
  variant: number | null
  messageText: string | null
  scheduledAt: string | null
  sentAt: string | null
  messageUrl: string | null
  screenshotUrl: string | null
  state: PlacementState | null
  verifiedAt: string | null
  note: string | null
}
