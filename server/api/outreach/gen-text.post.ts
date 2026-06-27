import { getLlmProvider } from '~/server/llm/provider'
import { MESSAGE_VARIANTS } from '~/server/outreach/targets.seed'

// Generate ONE fresh, natural variation of the benzinradar share message so the
// operator never posts the exact same wording twice (lower spam footprint).
// Falls back to a static variant if no LLM is configured or the call fails —
// posting must never be blocked by the model being down.

const URL = 'https://benzinradar.com'

// Reference messages (the operator's own voice) — anchor the register so the
// model matches THIS tone instead of drifting into teen slang.
const REFERENCES = [
  'нашёл карту, где люди отмечают наличие топлива на АЗС. можно быстро глянуть и при желании добавить свою отметку.',
  'нашёл карту наличия бензина на АЗС. если кто-то сегодня заправлялся — можно отметить свою заправку, чтобы другим было проще ориентироваться.',
  'здесь можно посмотреть наличие топлива на АЗС. карта пополняется самими водителями, чем больше отметок, тем точнее.',
]

const SYSTEM = [
  'Ты пишешь ОДНО короткое сообщение для телеграм-чата водителей/такси — спокойно и по делу,',
  'как взрослый человек, который нашёл полезную карту наличия топлива на АЗС и делится ей.',
  'Тон: ровный, естественный, для взрослой аудитории. БЕЗ молодёжного сленга и слов-паразитов',
  '(никаких «народ», «кста», «чекай», «движ», «штука», «кидайте», «го»), без эмодзи,',
  'без рекламного пафоса и без канцелярита. Простой ясный язык, можно со строчной буквы.',
  '1–2 коротких предложения. Суть: это карта наличия бензина/топлива на заправках,',
  'её пополняют сами водители — чем больше отметок, тем точнее; можно отметить свою заправку.',
  `В конце — ссылка ${URL} с НОВОЙ строки.`,
  'Ориентируйся на стиль примеров ниже (тот же регистр), но формулируй КАЖДЫЙ раз по-новому.',
  'Примеры тона:',
  ...REFERENCES.map((r) => `— ${r}`),
  'Выведи ТОЛЬКО текст сообщения, без кавычек и пояснений.',
].join('\n')

// Random angle nudges the model toward a different phrasing each call.
const ANGLES = [
  'сделай акцент на том, что данные собирают сами водители',
  'сделай акцент на пользе в период дефицита топлива',
  'сделай акцент на том, что можно отметить свою заправку и помочь другим',
  'начни с того, что наткнулся на это случайно',
  'сделай максимально лаконично, в одно предложение',
  'сделай нейтрально-информативным, как короткая заметка',
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
