import { google } from 'googleapis'

// TEMPORARY diagnostic endpoint for the sheet-as-database wiring on Render.
// Reports env presence and the REAL underlying Sheets error (the normal
// endpoints mask everything as a generic 502). Never returns the private key
// or any secret material — only non-sensitive metadata (lengths, booleans,
// service-account email, sheet id) plus the raw error text.
export default defineEventHandler(async () => {
  const b64 = process.env.GOOGLE_SA_JSON
  const sheetId = process.env.OUTREACH_SHEET_ID

  const diag: Record<string, unknown> = {
    GOOGLE_SA_JSON_present: !!b64,
    GOOGLE_SA_JSON_length: b64?.length ?? 0,
    OUTREACH_SHEET_ID_present: !!sheetId,
    OUTREACH_SHEET_ID_value: sheetId ?? null,
  }

  // Step 1: does the base64 decode to valid JSON with the expected fields?
  let credentials: Record<string, unknown> | null = null
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8')
      diag.decoded_length = decoded.length
      diag.decoded_head = decoded.slice(0, 12) // expect '{"type":"ser'
      const json = JSON.parse(decoded) as Record<string, unknown>
      credentials = json
      diag.base64_decodes_to_json = true
      diag.client_email = json.client_email ?? null
      diag.project_id = json.project_id ?? null
      diag.has_private_key = !!json.private_key
    } catch (err) {
      diag.base64_decodes_to_json = false
      diag.decode_error = err instanceof Error ? err.message : String(err)
    }
  }

  // Step 2: attempt a real read and surface the actual error (code + message).
  if (credentials && sheetId) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
      const sheets = google.sheets({ version: 'v4', auth })
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'A2:Q5000' })
      diag.read_ok = true
      diag.rows_read = (res.data.values ?? []).length
    } catch (err: unknown) {
      diag.read_ok = false
      const e = err as { code?: unknown; message?: unknown }
      diag.read_error_code = e?.code ?? null
      diag.read_error_message = e?.message instanceof Object ? JSON.stringify(e.message) : (e?.message ?? String(err))
    }
  }

  return { success: true, data: diag, error: null }
})
