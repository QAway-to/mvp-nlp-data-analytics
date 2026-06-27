import { BROWSER_UA, stripHtml } from './leads'

// Shared helpers for inspecting Telegram's public web surface (t.me).
// Used by check-chat (is a group worth posting in: alive, ACTIVE, ad-tolerant)
// and verify-message (did a placement survive, or was it deleted by a mod).
//
// Scope & limits: this only sees what t.me exposes publicly. Public groups with
// the web preview enabled are fully checkable; closed/private supergroups expose
// little — there we return 'unknown' and the operator verifies by hand. No account
// is ever used, so nothing here can get an account flagged.

const FETCH_TIMEOUT_MS = 12_000
const CHANNEL_RE = /^[a-zA-Z0-9_]{4,32}$/

export interface FetchResult {
  ok: boolean
  status: number
  html: string
}

// Plain GET with a browser UA + timeout. Never throws on HTTP errors — callers
// branch on `ok`/`status` so "not found" is data, not an exception.
export async function fetchTme(url: string): Promise<FetchResult> {
  // Hard allowlist: this helper must only ever reach Telegram's public host.
  // Guards against a future caller turning it into an SSRF primitive.
  if (!url.startsWith('https://t.me/')) {
    throw new Error(`fetchTme blocked non-t.me URL: ${url}`)
  }
  try {
    const res = await fetch(url, {
      // Accept-Language pins the embed locale so deletion strings stay matchable.
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const html = res.ok ? await res.text() : ''
    return { ok: res.ok, status: res.status, html }
  } catch {
    return { ok: false, status: 0, html: '' }
  }
}

// Accepts '@chan', 'chan', 't.me/chan', 'https://t.me/chan/123' → bare username.
export function parseHandle(input: string): string {
  return input
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^t\.me\//i, '')
    .replace(/\/.*$/, '')
    .trim()
}

export function isValidHandle(handle: string): boolean {
  return CHANNEL_RE.test(handle)
}

// "tgme_page_extra" carries "31 025 members, 882 online" (or subscribers). Pull
// the first count (members/subscribers) and, if present, the live "online" count
// — the latter is our strongest cheap activity proxy.
export function parseCounts(html: string): { members: number | null; online: number | null } {
  const m = html.match(/tgme_page_extra[^>]*>([^<]+)</)
  if (!m) return { members: null, online: null }
  const text = stripHtml(m[1]).toLowerCase().replace(/ /g, ' ')
  let members: number | null = null
  let online: number | null = null
  for (const clause of text.split(',')) {
    const value = parseUnitNumber(clause)
    if (value === null) continue
    if (/online|онлайн/.test(clause)) online = value
    else if (/members|subscribers|подписчик|участник/.test(clause)) members = value
  }
  return { members, online }
}

// First number in a clause, honouring a trailing K/M (к/м) and spaced thousands.
// The multiplier is only counted when k/m is a standalone token — the negative
// lookahead stops "members"/"м.." from being read as a million suffix.
function parseUnitNumber(clause: string): number | null {
  const num = clause.match(/\d[\d.,\s]*/)
  if (!num) return null
  const base = parseFloat(num[0].replace(/[\s,]/g, ''))
  if (Number.isNaN(base)) return null

  const after = clause.slice((num.index ?? 0) + num[0].length)
  const unit = after.match(/^\s*([kкmм])(?![a-zа-яё])/i)
  const c = unit ? unit[1].toLowerCase() : ''
  const mult = c === 'k' || c === 'к' ? 1_000 : c === 'm' || c === 'м' ? 1_000_000 : 1
  return Math.round(base * mult)
}

export function parseDescription(html: string): string {
  const m = html.match(/tgme_page_description[^>]*>([\s\S]*?)<\/div>/)
  return m ? stripHtml(m[1]) : ''
}

// ───────────── activity (from the t.me/s/<chat> mirror) ─────────────

export type ActivityLevel = 'high' | 'medium' | 'low' | 'dead' | 'unknown'

export interface Activity {
  level: ActivityLevel
  recent24h: number          // messages dated within the last 24h
  lastPostAt: string | null  // ISO of newest visible message
  sample: number             // total messages the mirror exposed
}

// Newest-message recency + last-24h volume + live online → a real "is anyone
// talking here" read, instead of trusting a (often stale/inflated) member count.
export function assessActivity(mirrorHtml: string, online: number | null): Activity {
  const times = [...mirrorHtml.matchAll(/datetime="([^"]+)"/g)]
    .map((t) => Date.parse(t[1]))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a)

  if (times.length === 0) {
    // Mirror empty/disabled (typical for supergroups — Telegram hides their
    // history). The live "online" count is a WEAK proxy: a busy group can show
    // 3-4 online in a quiet second. So a high online still implies activity, but
    // a low one is inconclusive → 'unknown' (manual check), never 'dead'. Only
    // the mirror path below (channels, with real timestamps) may return 'dead'.
    if (online === null) return { level: 'unknown', recent24h: 0, lastPostAt: null, sample: 0 }
    const level: ActivityLevel = online >= 200 ? 'high' : online >= 50 ? 'medium' : 'unknown'
    return { level, recent24h: 0, lastPostAt: null, sample: 0 }
  }

  const now = Date.now()
  const dayAgo = now - 24 * 3_600_000
  const recent24h = times.filter((t) => t >= dayAgo).length
  const lastPostAt = new Date(times[0]).toISOString()
  const ageHours = (now - times[0]) / 3_600_000

  let level: ActivityLevel
  if (ageHours > 24 * 7) level = 'dead'
  else if (recent24h >= 20 || (online ?? 0) >= 200) level = 'high'
  else if (recent24h >= 5 || (online ?? 0) >= 50) level = 'medium'
  else level = 'low'

  return { level, recent24h, lastPostAt, sample: times.length }
}

// ───────────── ad policy (from description + visible text) ─────────────

export type AdPolicy = 'forbidden' | 'paid' | 'approval' | 'open' | 'unknown'

export interface AdPolicyCheck {
  policy: AdPolicy
  evidence: string | null
}

// Ordered most-restrictive first; first hit wins. Bounded quantifiers → ReDoS-safe.
const POLICY_RULES: ReadonlyArray<{ policy: Exclude<AdPolicy, 'open' | 'unknown'>; re: RegExp }> = [
  // External links banned (our whole post is a link → useless) is as fatal as an ad ban.
  { policy: 'forbidden', re: /(реклам\w{0,3}\s{0,3}запрещ|запрещ\w{0,5}\s{0,3}реклам|без\s{0,3}реклам|за\s{0,3}реклам\w{0,3}[^.]{0,20}бан|спам[^.]{0,15}бан|no\s{0,3}ads|ads\s{0,3}(are\s{0,3})?forbidden|внешн[^.]{0,8}ссылк[^.]{0,20}(запрещ|блокир|удал|нельзя)|ссылк[^.]{0,18}(запрещ|блокир|удаля)|нельзя[^.]{0,8}ссылк)/i },
  { policy: 'paid', re: /(реклам\w{0,3}[^.]{0,20}(платн|оплат|прайс|\d{2,}\s{0,3}(₽|руб))|платн\w{0,5}\s{0,3}реклам|реклама[^.]{0,10}\d{2,})/i },
  { policy: 'approval', re: /(по\s{0,3}согласован|согласова\w{0,4}[^.]{0,15}админ|реклам\w{0,3}[^.]{0,15}(через|у|пишите)[^.]{0,10}админ|реклам\w{0,3}\s{0,3}@)/i },
]

export function scanAdPolicy(text: string): AdPolicyCheck {
  const haystack = text.toLowerCase()
  for (const { policy, re } of POLICY_RULES) {
    const m = haystack.match(re)
    if (m) return { policy, evidence: m[0].trim().slice(0, 120) }
  }
  return { policy: 'unknown', evidence: null }
}

// ───────────── entry barrier (verification / captcha / join-request) ─────────────

export interface EntryBarrierCheck {
  barrier: boolean
  evidence: string | null
}

// Gates a human passes once but an automated sender cannot: join-request approval,
// captcha / anti-bot bots, "prove you're not a robot", verification via a bot.
// Bounded quantifiers → ReDoS-safe. First hit wins. Tuned to need a barrier-specific
// context (never matches a bare "бот", which is common in taxi-order descriptions).
const ENTRY_BARRIER_RULES: ReadonlyArray<RegExp> = [
  // join by request / admin approval — requires BOTH a "join" stem and "заявк"/
  // "одобр" nearby (\w can't bridge Cyrillic in JS, so use [^.] gaps). Never fires
  // on a bare "по заявкам", which legit taxi/delivery groups use for their service.
  /вступ[^.]{0,20}заявк|заявк[^.]{0,20}вступ|вход[^.]{0,12}заявк|вступ[^.]{0,15}одобр/i,
  // captcha / anti-bot / prove-you're-not-a-robot
  /капч|captcha|антибот|anti[\s-]{0,2}bot|анти[\s-]{0,2}спам[\s-]{0,2}бот|вы\s{0,3}не\s{0,3}робот|(докаж|подтверд)\w{0,5}[^.]{0,15}не\s{0,3}(ро)?бот/i,
  // verification (RU + Latin "verif…"), or a bot you must message to be let in
  /верифи\w{0,6}|verif\w{0,4}|(для\s{0,3}вступлени\w{0,3}|чтобы\s{0,3}вступ\w{0,3})[^.]{0,15}бот|напиш\w{0,3}[^.]{0,12}бот\w{0,3}[^.]{0,15}вступ/i,
  // managed ad networks (UMA & co.) — free posting is auto-blocked there
  /uma_admin|umatg\.ru|umamall\.ru|verifuma|каталог\s{0,3}uma|биржа\s{0,3}uma/i,
]

export function scanEntryBarrier(text: string): EntryBarrierCheck {
  const haystack = text.toLowerCase()
  for (const re of ENTRY_BARRIER_RULES) {
    const m = haystack.match(re)
    if (m) return { barrier: true, evidence: m[0].trim().slice(0, 120) }
  }
  return { barrier: false, evidence: null }
}
