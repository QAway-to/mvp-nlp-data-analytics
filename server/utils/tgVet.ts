import type { Api } from 'telegram'

// Shared authoritative vetting of a Telegram chat (from account-level flags),
// used by both discovery (new candidates) and re-audit (existing sheet rows).
// These are facts the public t.me page can't see: real type, member-post rights,
// join-by-request, slow-mode, plus a border-region block.

// Conflict/border regions to exclude (Belgorod intentionally kept).
export const BORDER_RE =
  /крым|crimea|симферопол|севастопол|керч|донецк|done?ck|донбас|\bднр\b|\bdnr\b|луганск|\bлнр\b|\blnr\b|мариупол|мелитопол|макеевк/i

export interface VetResult {
  ok: boolean
  reasons: string[]
  members: number
  isGroup: boolean
}

interface VetOpts { min?: number; max?: number }

// Vet a resolved channel + its full info. `ch` carries the cheap flags
// (broadcast/megagroup/username/joinRequest/defaultBannedRights); `fc` adds
// participantsCount / slowmode / about.
export function vetChannel(ch: Api.Channel, fc: Api.ChannelFull, opts: VetOpts = {}): VetResult {
  const min = opts.min ?? 300
  const max = opts.max ?? 25_000
  const reasons: string[] = []

  const isGroup = !!ch.megagroup && !ch.broadcast
  const members = Number(fc.participantsCount ?? 0)
  const about = (fc as { about?: string }).about ?? ''
  const banned = ch.defaultBannedRights?.sendMessages || fc.defaultBannedRights?.sendMessages
  const slow = Number(fc.slowmodeSeconds ?? 0)

  if (!isGroup) reasons.push('канал — нельзя писать')
  if (ch.joinRequest) reasons.push('вступление по заявке')
  if (banned) reasons.push('писать нельзя')
  if (members && members < min) reasons.push(`мал ${members}`)
  if (members > max) reasons.push(`мега ${members}`)
  if (slow > 300) reasons.push(`slowmode ${slow}s`)
  if (BORDER_RE.test(`${ch.title ?? ''} ${about}`)) reasons.push('пограничный регион')

  return { ok: reasons.length === 0, reasons, members, isGroup }
}
