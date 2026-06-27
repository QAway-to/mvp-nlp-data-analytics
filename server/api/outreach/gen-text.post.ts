import { getLlmProvider } from '~/server/llm/provider'
import { MESSAGE_VARIANTS } from '~/server/outreach/targets.seed'

// Generate ONE fresh, natural variation of the benzinradar share message so the
// operator never posts the exact same wording twice (lower spam footprint).
// Falls back to a static variant if no LLM is configured or the call fails —
// posting must never be blocked by the model being down.

const URL = 'https://benzinradar.com'

const SYSTEM = [
  'Ты пишешь ОДНО короткое сообщение для телеграм-чата водителей/такси — как обычный человек,',
  'который случайно нашёл полезную карту наличия топлива на АЗС и делится ей по-дружески.',
  'Тон: живой, неформальный, без рекламного пафоса и канцелярита, можно со строчной буквы, без эмодзи.',
  '1–2 коротких предложения. Суть: это карта наличия бензина/топлива на заправках,',
  'её пополняют сами водители — чем больше отметок, тем точнее. Можно отметить свою заправку.',
  `В конце — ссылка ${URL} с НОВОЙ строки.`,
  'Каждый раз формулируй ПО-РАЗНОМУ. Выведи ТОЛЬКО текст сообщения, без кавычек и пояснений.',
].join(' ')

// Random angle nudges the model toward a different phrasing each call.
const ANGLES = [
  'сделай акцент на том, что данные от самих водителей',
  'сделай акцент на пользе в дефицит топлива',
  'сделай акцент на «отметь свою заправку — поможешь другим»',
  'начни с того, что наткнулся на это случайно',
  'сделай максимально короткий, в одно предложение',
  'сделай чуть более разговорным, как будто пишешь знакомым',
]

function fallback(): string {
  return MESSAGE_VARIANTS[Math.floor(Math.random() * MESSAGE_VARIANTS.length)]
}

function clean(raw: string): string {
  let t = raw.trim().replace(/^["'«»]+|["'«»]+$/g, '').trim()
  if (!t) return fallback()
  if (!t.toLowerCase().includes('benzinradar.com')) t = `${t}\n\n${URL}`
  return t
}

export default defineEventHandler(async () => {
  try {
    const provider = getLlmProvider()
    const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]
    const text = await provider.complete([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Сгенерируй свежую вариацию. ${angle}.` },
    ])
    const out = clean(text)
    return { success: true, text: out, source: provider.name }
  } catch (err) {
    // LLM unavailable → static variant, never block the operator.
    console.error('[gen-text] llm failed, using fallback:', err instanceof Error ? err.message : err)
    return { success: true, text: fallback(), source: 'fallback' }
  }
})
