import { google } from 'googleapis'
import type { sheets_v4 } from 'googleapis'
import { readFileSync } from 'node:fs'
import { parseHandle } from './tmeCheck'

// Sheet-as-database layer for the outreach campaign. The Google Sheet IS the
// store: targets, verdicts, schedule slots and placement statuses all live in
// columns. Auth via a service account — key supplied as base64 in GOOGLE_SA_JSON
// (Render), or a local file fallback for dev. No Postgres involved.

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const LOCAL_KEY_FALLBACK = 'C:\\Users\\sadov\\.config\\gcp\\sheets-sa.json'

// Column layout (1-indexed letters ↔ 0-indexed array positions).
export const COL = {
  num: 0, city: 1, category: 2, title: 3, chatUrl: 4, members: 5, variant: 6,
  postedDate: 7, messageUrl: 8, screenshot: 9, status: 10, verifiedAt: 11,
  verdict: 12, reason: 13, slot: 14, online: 15, activity: 16,
} as const
const LAST_COL = 'Q'

export type Status =
  | 'ожидает' | 'запланировано' | 'размещено' | 'проверено' | 'удалено' | 'пропущено' | 'skip'

export interface SheetRow {
  row: number            // 1-based sheet row (data starts at 2)
  handle: string         // parsed from chatUrl/title
  city: string
  category: string
  title: string
  members: string
  variant: string
  postedDate: string
  messageUrl: string
  screenshot: string
  status: string
  verifiedAt: string
  verdict: string        // GO | CAUTION | SKIP | ''
  reason: string
  slot: string           // planned send time (ISO) or ''
  online: string
  activity: string
}

let cached: sheets_v4.Sheets | null = null

function credentials(): Record<string, unknown> {
  // Secret comes from the env var (set on Render). Local key file is a dev-only
  // fallback when the env var is absent.
  const b64 = process.env.GOOGLE_SA_JSON
  if (b64) return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
  try {
    return JSON.parse(readFileSync(LOCAL_KEY_FALLBACK, 'utf8'))
  } catch {
    throw createError({ statusCode: 500, message: 'GOOGLE_SA_JSON not configured' })
  }
}

function sheetId(): string {
  const id = process.env.OUTREACH_SHEET_ID
  if (!id) throw createError({ statusCode: 500, message: 'OUTREACH_SHEET_ID not configured' })
  return id
}

function api(): sheets_v4.Sheets {
  if (cached) return cached
  const auth = new google.auth.GoogleAuth({ credentials: credentials(), scopes: SCOPES })
  cached = google.sheets({ version: 'v4', auth })
  return cached
}

function cell(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

// Read the whole queue (header row skipped). Unqualified range → first sheet.
export async function readQueue(): Promise<SheetRow[]> {
  // Resolve config/auth OUTSIDE the try so a missing env var surfaces as its own
  // 500 ("not configured") instead of being masked as a generic 502.
  const id = sheetId()
  const client = api()
  let res
  try {
    res = await client.spreadsheets.values.get({ spreadsheetId: id, range: `A2:${LAST_COL}5000` })
  } catch (err) {
    cached = null // drop possibly-stale auth so the next call re-initialises
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[sheets] read failed:', detail)
    throw createError({ statusCode: 502, message: `Google Sheets read failed: ${detail}` })
  }
  const values = res.data.values ?? []
  return values
    .map((r, i): SheetRow => {
      const at = (c: number) => cell(r[c])
      const chatUrl = at(COL.chatUrl)
      return {
        row: i + 2,
        handle: parseHandle(chatUrl || at(COL.title)),
        city: at(COL.city), category: at(COL.category), title: at(COL.title),
        members: at(COL.members), variant: at(COL.variant), postedDate: at(COL.postedDate),
        messageUrl: at(COL.messageUrl), screenshot: at(COL.screenshot), status: at(COL.status),
        verifiedAt: at(COL.verifiedAt), verdict: at(COL.verdict), reason: at(COL.reason),
        slot: at(COL.slot), online: at(COL.online), activity: at(COL.activity),
      }
    })
    .filter((r) => r.handle.length > 0)
}

export interface CellUpdate { range: string; values: (string | number)[][] }

// Batch-write specific ranges (RAW). Keeps writes surgical so a human editing
// other columns is not clobbered.
export async function batchWrite(updates: CellUpdate[]): Promise<void> {
  if (updates.length === 0) return
  try {
    await api().spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId(),
      requestBody: { valueInputOption: 'RAW', data: updates.map((u) => ({ range: u.range, values: u.values })) },
    })
  } catch (err) {
    cached = null
    console.error('[sheets] batchUpdate failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 502, message: 'Google Sheets write failed' })
  }
}

export async function appendRows(rows: (string | number)[][]): Promise<void> {
  if (rows.length === 0) return
  try {
    await api().spreadsheets.values.append({
      spreadsheetId: sheetId(),
      range: `A1:${LAST_COL}1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    })
  } catch (err) {
    cached = null
    console.error('[sheets] append failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 502, message: 'Google Sheets append failed' })
  }
}

const COL_LETTER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'] as const

// Build a single-cell A1 range for a given COL index + sheet row.
export function cellRange(colIndex: number, row: number): string {
  const letter = COL_LETTER[colIndex]
  if (!letter) throw new Error(`cellRange: column index ${colIndex} out of range`)
  return `${letter}${row}`
}
