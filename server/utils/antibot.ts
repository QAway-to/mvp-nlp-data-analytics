import type { TelegramClient } from 'telegram'

// Best-effort solver for the COMMON button-captcha antibot gate ("Поехали" →
// bot → «Да, я бот / Нет»). Handles: a challenge button in the group (URL deep-link
// to a captcha bot, or an inline callback), then a yes/no (or single-confirm)
// captcha in the bot's DM. Exotic captchas (math, emoji-pick) are NOT solved →
// caller skips the group. Every transition is spaced ≥1s to look human and to let
// Telegram register state between steps.

const STEP = 1200
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const CHALLENGE_RE = /поехал|не\s*бот|не\s*робот|я\s*человек|подтверд|пройти\s*провер|разблок|verify|i'?m\s*not\s*a?\s*bot|нажм|начать\s*провер|капч/i
const HUMAN_RE = /^\s*нет|не\s*бот|не\s*робот|я\s*человек|^\s*человек|^\s*no\b|not\s*a?\s*bot|🙅|❌/i
const BOTANS_RE = /^\s*да|^\s*я?\s*бот|^\s*yes|робот|i\s*am\s*a?\s*bot/i

// Minimal shape of a GramJS MessageButton (client-augmented helpers).
interface BtnLike { text?: string; url?: string; data?: Buffer; click: () => Promise<unknown> }
interface MsgLike { buttons?: BtnLike[][] }

export interface AntibotResult { attempted: boolean; passed: boolean; note: string }

type EntityArg = Parameters<TelegramClient['getMessages']>[0]

function flatButtons(m: MsgLike): BtnLike[] {
  const out: BtnLike[] = []
  for (const row of m.buttons ?? []) for (const b of row) out.push(b)
  return out
}

export async function passAntibot(client: TelegramClient, group: EntityArg): Promise<AntibotResult> {
  try {
    await sleep(STEP)
    const msgs = (await client.getMessages(group, { limit: 8 })) as unknown as MsgLike[]
    let challenge: BtnLike | undefined
    for (const m of msgs) {
      challenge = flatButtons(m).find((b) => CHALLENGE_RE.test(b.text ?? ''))
      if (challenge) break
    }
    if (!challenge) return { attempted: false, passed: false, note: 'челлендж-кнопка не найдена' }

    await sleep(STEP)
    // URL button → deep-link to a captcha bot (t.me/<bot>?start=<token>)
    if (challenge.url) {
      const m = challenge.url.match(/t\.me\/([A-Za-z0-9_]+)\?start=([A-Za-z0-9_=-]+)/i)
      if (!m) return { attempted: true, passed: false, note: 'url-кнопка без start-параметра' }
      const [, botUser, startParam] = m
      // /start <param> is equivalent to the deep-link and avoids raw StartBot wiring.
      await client.sendMessage(botUser, { message: `/start ${startParam}` })
      await sleep(STEP + 800)
      return await answerBotCaptcha(client, botUser)
    }
    // inline callback → click directly in the group
    if (challenge.data) {
      await challenge.click()
      await sleep(STEP + 800)
      return { attempted: true, passed: true, note: 'callback-кнопка нажата' }
    }
    return { attempted: true, passed: false, note: 'неизвестный тип кнопки' }
  } catch (e) {
    return { attempted: true, passed: false, note: `ошибка антибота: ${String((e as Error)?.message).slice(0, 50)}` }
  }
}

async function answerBotCaptcha(client: TelegramClient, botUser: string): Promise<AntibotResult> {
  await sleep(STEP)
  const dms = (await client.getMessages(botUser, { limit: 4 })) as unknown as MsgLike[]
  const cap = dms.find((m) => flatButtons(m).length > 0)
  if (!cap) return { attempted: true, passed: false, note: 'бот не прислал кнопок' }
  const flat = flatButtons(cap)

  // pick the human answer; fall back to a lone confirm button
  let answer = flat.find((b) => HUMAN_RE.test(b.text ?? '') && !BOTANS_RE.test(b.text ?? ''))
  if (!answer && flat.length === 1) answer = flat[0]
  if (!answer) return { attempted: true, passed: false, note: `капча не распознана: [${flat.map((b) => b.text).join(' | ')}]` }

  await sleep(STEP)
  await answer.click()
  await sleep(STEP + 800)
  return { attempted: true, passed: true, note: `ответил «${answer.text}»` }
}
