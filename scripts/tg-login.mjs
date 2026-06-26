// One-off MTProto login → prints a reusable StringSession for ONE dedicated account.
//
// Purpose: connect a Telegram account you registered yourself to the outreach tool.
// It does NOT register accounts and does NOT farm them — it authenticates one
// existing account and emits a session string you store as a secret.
//
// Usage:
//   npm i telegram            # one-time, adds GramJS
//   node scripts/tg-login.mjs
//
// You will be asked for: api_id, api_hash (from https://my.telegram.org → API
// development tools), phone, the login code Telegram sends you, and 2FA password
// if enabled. The session string is printed ONCE — copy it into your secrets
// (TG_SESSION_1 / TG_SESSION_2). Never commit it; treat it like a password
// (it grants full access to the account).

import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

const rl = readline.createInterface({ input, output })
const ask = (q) => rl.question(q)

async function main() {
  console.log('\n— Telegram session generator (single account) —\n')

  const apiId = Number((await ask('api_id: ')).trim())
  const apiHash = (await ask('api_hash: ')).trim()
  if (!Number.isInteger(apiId) || apiId <= 0 || !apiHash) {
    console.error('\n✗ api_id must be a number and api_hash non-empty (get both at my.telegram.org).')
    process.exit(1)
  }

  const session = new StringSession('') // empty → fresh login
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 3 })

  await client.start({
    phoneNumber: async () => (await ask('phone (e.g. +79991234567): ')).trim(),
    phoneCode: async () => (await ask('login code (from Telegram/SMS): ')).trim(),
    password: async () => (await ask('2FA password (blank if none): ')).trim(),
    onError: (err) => console.error('login error:', err?.message ?? err),
  })

  const me = await client.getMe()
  const sessionString = client.session.save()

  console.log(`\n✓ Logged in as @${me.username ?? me.id} (${me.firstName ?? ''})`)
  console.log('\n──────── SESSION STRING (store as a secret, do NOT commit) ────────\n')
  console.log(sessionString)
  console.log('\n──────────────────────────────────────────────────────────────────')
  console.log('Put it in your env as TG_SESSION_1 (or TG_SESSION_2 for the backup).')
  console.log('Anyone with this string controls the account — keep it like a password.\n')

  await client.disconnect()
  rl.close()
  process.exit(0)
}

main().catch((e) => {
  console.error('\n✗ Failed:', e?.message ?? e)
  process.exit(1)
})
