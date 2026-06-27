// READ-ONLY discovery: find postable, thematic GROUPS across RF via the account's
// search, read AUTHORITATIVE flags/permissions (group-vs-channel, can-members-post,
// join-by-request, slow-mode, size), and append the good ones to the outreach sheet.
// No joining, no posting → ~zero ban risk. Run locally:
//   node scripts/tg-login.mjs   # once → TG_SESSION
//   TG_SESSION=... node scripts/discover.mjs
//
// Env: API_ID_TELEGRAM, API_HASH, TG_SESSION, [OUTREACH_SHEET_ID], [SA_KEY path].

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { TelegramClient, Api } = require('telegram')
const { StringSession } = require('telegram/sessions/index.js')
const { google } = require('googleapis')

const API_ID = Number(process.env.API_ID_TELEGRAM || process.env.API_ID)
const API_HASH = process.env.API_HASH
const SESSION = process.env.TG_SESSION
const SHEET_ID = process.env.OUTREACH_SHEET_ID || '14KpAaT56cvE7whdZlB3oWy9I_rpAVWd3dmfQwThNIaQ'
const SA_KEY = process.env.SA_KEY || 'C:/Users/sadov/.config/gcp/sheets-sa.json'

// Query set (geo = вся РФ): national driver/fuel verticals + city-qualified taxi
// to surface regional chats. contacts.search returns top public matches per query.
const QUERIES = [
  'дальнобойщики', 'дальнобой', 'попутчики', 'грузоперевозки', 'таксисты', 'такси водители',
  'азс', 'заправки', 'бензин', 'топливо', 'автомобилисты',
  ...['екатеринбург', 'новосибирск', 'самара', 'пермь', 'омск', 'ростов', 'воронеж',
      'краснодар', 'нижний новгород', 'челябинск', 'уфа', 'волгоград', 'красноярск',
      'тюмень', 'саратов', 'казань', 'тольятти', 'ижевск'].map((c) => `такси ${c}`),
]

const MIN_MEMBERS = 300
const MAX_MEMBERS = 25000
const RELEVANT = /такси|таксист|водител|дальнобой|фура|перевоз|попутчик|межгород|авто|азс|заправк|бензин|топлив|дорог/i
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function withFloodRetry(fn, label) {
  for (let i = 0; i < 3; i++) {
    try { return await fn() }
    catch (e) {
      const m = String(e?.message || e)
      const wait = m.match(/FLOOD_WAIT_(\d+)/)
      if (wait) { const s = Math.min(Number(wait[1]) + 2, 120); console.log(`  FLOOD_WAIT ${s}s (${label})`); await sleep(s * 1000); continue }
      throw e
    }
  }
}

async function main() {
  if (!API_ID || !API_HASH) throw new Error('API_ID_TELEGRAM / API_HASH not set')
  if (!SESSION) throw new Error('TG_SESSION not set — run scripts/tg-login.mjs first')

  const client = new TelegramClient(new StringSession(SESSION), API_ID, API_HASH, { connectionRetries: 3 })
  await client.connect()
  const me = await client.getMe()
  console.log(`connected as @${me.username ?? me.id}\n`)

  // 1) gather candidate channels from search (cheap pre-filter on search flags)
  const seen = new Map() // username(lower) -> Channel
  for (const q of QUERIES) {
    const res = await withFloodRetry(() => client.invoke(new Api.contacts.Search({ q, limit: 40 })), `search "${q}"`)
    const chats = res?.chats ?? []
    let added = 0
    for (const ch of chats) {
      // keep only public supergroups (megagroup) — channels (broadcast) can't be posted to
      if (ch.className !== 'Channel') continue
      if (ch.broadcast || !ch.megagroup) continue
      if (!ch.username) continue // must be public to post without an invite
      const u = ch.username.toLowerCase()
      if (!seen.has(u)) { seen.set(u, ch); added++ }
    }
    console.log(`search "${q}": +${added} (всего ${seen.size})`)
    await sleep(1200)
  }

  // 2) authoritative per-chat check via getFullChannel (permissions, size, join-mode)
  console.log(`\nрезолвлю ${seen.size} кандидатов (права/размер/join)…\n`)
  const good = []
  for (const ch of seen.values()) {
    // cheap flag drops first (present on the search object)
    if (ch.joinRequest) { continue }          // join-by-request → auto can't pass
    if (ch.defaultBannedRights?.sendMessages) { continue } // members can't send
    let full
    try {
      full = await withFloodRetry(() => client.invoke(new Api.channels.GetFullChannel({ channel: ch })), `full @${ch.username}`)
    } catch (e) { console.log(`  ✗ @${ch.username}: ${String(e?.message).slice(0, 40)}`); await sleep(800); continue }
    const fc = full.fullChat
    const members = Number(fc.participantsCount ?? 0)
    const banned = fc.defaultBannedRights?.sendMessages
    const slow = Number(fc.slowmodeSeconds ?? 0)
    const about = (fc.about || '')
    const relevant = RELEVANT.test(ch.title + ' ' + about)

    const reasons = []
    if (banned) reasons.push('писать нельзя')
    if (members && members < MIN_MEMBERS) reasons.push(`мал ${members}`)
    if (members > MAX_MEMBERS) reasons.push(`мега ${members}`)
    if (slow > 300) reasons.push(`slowmode ${slow}s`)
    if (!relevant) reasons.push('не релевантно')

    const tag = reasons.length ? '· skip' : '✅'
    console.log(`${tag} @${ch.username.padEnd(24)} | ${String(members).padStart(6)} | slow:${slow} | ${ch.title.slice(0, 30)} ${reasons.length ? '— ' + reasons.join(', ') : ''}`)
    if (!reasons.length) good.push({ handle: ch.username, title: ch.title, members })
    await sleep(1000)
  }

  // 3) append the good ones to the sheet (dedup by handle)
  console.log(`\nгодных постируемых групп: ${good.length}`)
  if (good.length) await writeSheet(good)
  await client.disconnect()
  process.exit(0)
}

async function writeSheet(good) {
  const key = require(SA_KEY)
  const auth = new google.auth.GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'A2:Q5000' })
  const rows = res.data.values || []
  const have = new Set(rows.map((r) => (r[4] || '').replace(/^https?:\/\/t\.me\//i, '').replace(/\/.*/, '').toLowerCase()))
  const fresh = good.filter((g) => !have.has(g.handle.toLowerCase()))
  if (!fresh.length) { console.log('все уже в таблице'); return }
  const base = rows.length
  const out = fresh.map((g, i) => {
    const r = new Array(17).fill('')
    r[0] = base + i + 1; r[1] = 'вся РФ'; r[2] = 'discovered'; r[3] = g.title
    r[4] = `https://t.me/${g.handle}`; r[5] = g.members || ''; r[10] = 'ожидает'
    return r
  })
  await sheets.spreadsheets.values.append({ spreadsheetId: SHEET_ID, range: 'A1:Q1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: out } })
  console.log(`добавлено в таблицу: ${fresh.length}`)
}

main().catch((e) => { console.error('\n✗ FATAL:', e?.message ?? e); process.exit(1) })
