import { stripHtml } from './leads'
import {
  fetchTme, parseHandle, isValidHandle, parseCounts, parseDescription,
  assessActivity, scanAdPolicy,
  type ActivityLevel, type AdPolicy,
} from './tmeCheck'

// Core "is this chat worth posting in" assessment, shared by the on-demand
// endpoint (check-chat) and the batch pre-flight over the whole queue. Judges
// what matters for native, non-wasted outreach: ALIVE & ACTIVE (real discussion,
// not an inflated member count) and AD-TOLERANT (won't auto-ban / require paid or
// pre-approved promo) → go / caution / skip. No account is ever used.

export type ChatKind = 'group' | 'channel' | 'unknown'
export type Recommendation = 'go' | 'caution' | 'skip'

export interface ChatAssessment {
  handle: string
  url: string
  alive: boolean
  kind: ChatKind
  title: string | null
  members: number | null
  online: number | null
  activity: ActivityLevel
  recent24h: number
  lastPostAt: string | null
  adPolicy: AdPolicy
  adEvidence: string | null
  isGroup: boolean
  recommendation: Recommendation
  reasons: string[]
  checkedAt: string
}

function classifyKind(html: string): ChatKind {
  const m = html.match(/tgme_page_extra[^>]*>([^<]+)</)
  const text = m ? stripHtml(m[1]).toLowerCase() : ''
  if (/members|участник/.test(text)) return 'group'
  if (/subscribers|подписчик/.test(text)) return 'channel'
  return 'unknown'
}

type AssessmentCore = Omit<ChatAssessment, 'recommendation' | 'reasons'>

export function decide(a: AssessmentCore): { recommendation: Recommendation; reasons: string[] } {
  if (!a.alive) return { recommendation: 'skip', reasons: ['чат не найден или закрыт публично'] }
  if (a.activity === 'dead') return { recommendation: 'skip', reasons: ['мёртвый: нет свежих сообщений'] }
  if (a.activity === 'unknown' && a.members !== null && a.members < 30) {
    return { recommendation: 'skip', reasons: [`похоже мёртвый: всего ${a.members} участников`] }
  }
  if (a.adPolicy === 'forbidden') return { recommendation: 'skip', reasons: [`реклама запрещена: «${a.adEvidence}»`] }

  let rec: Recommendation = 'go'
  const reasons: string[] = []
  if (a.kind === 'channel') { rec = 'caution'; reasons.push('это канал — постить можно только в комментариях под постом') }
  if (a.adPolicy === 'paid') { rec = 'caution'; reasons.push(`реклама платная: «${a.adEvidence}»`) }
  if (a.adPolicy === 'approval') { rec = 'caution'; reasons.push(`нужно согласование с админом: «${a.adEvidence}»`) }
  if (a.activity === 'low') { rec = 'caution'; reasons.push('низкая активность обсуждения') }
  if (a.activity === 'unknown') { rec = 'caution'; reasons.push('активность не видна публично — проверьте вручную') }
  if (a.adPolicy === 'unknown') reasons.push('правила по рекламе не видны — гляньте закреп перед первым постом')

  if (rec === 'go' && reasons.length === 0) reasons.push(`живой ${a.kind}, активность ${a.activity}`)
  return { recommendation: rec, reasons }
}

// Returns null when the handle is syntactically invalid (caller maps to 400).
export async function assessChat(handleInput: string): Promise<ChatAssessment | null> {
  const handle = parseHandle(handleInput)
  if (!isValidHandle(handle)) return null

  const url = `https://t.me/${handle}`
  const checkedAt = new Date().toISOString()

  const preview = await fetchTme(url)
  const titleMatch = preview.html.match(/tgme_page_title[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/)
  const title = titleMatch ? stripHtml(titleMatch[1]) : null
  const alive = preview.ok && title !== null

  if (!alive) {
    const core: AssessmentCore = {
      handle, url, alive: false, kind: 'unknown', title, members: null, online: null,
      activity: 'unknown', recent24h: 0, lastPostAt: null,
      adPolicy: 'unknown', adEvidence: null, isGroup: false, checkedAt,
    }
    return { ...core, ...decide(core) }
  }

  const kind = classifyKind(preview.html)
  const { members, online } = parseCounts(preview.html)
  const description = parseDescription(preview.html)

  // Only public groups/channels mirror messages; a miss just yields 'unknown' activity.
  const mirror = await fetchTme(`https://t.me/s/${handle}`)
  const activity = assessActivity(mirror.html, online)
  const adScan = scanAdPolicy(`${description}\n${stripHtml(mirror.html).slice(0, 4_000)}`)

  const core: AssessmentCore = {
    handle, url, alive: true, kind, title, members, online,
    activity: activity.level, recent24h: activity.recent24h, lastPostAt: activity.lastPostAt,
    adPolicy: adScan.policy, adEvidence: adScan.evidence, isGroup: kind === 'group', checkedAt,
  }
  return { ...core, ...decide(core) }
}
