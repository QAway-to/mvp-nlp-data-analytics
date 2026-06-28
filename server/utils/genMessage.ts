import { getLlmProvider } from '~/server/llm/provider'
import { MESSAGE_VARIANTS } from '~/server/outreach/targets.seed'

// Generate ONE fresh, natural variation of the benzinradar share message (adult,
// reference-anchored tone). Shared by the copy-text endpoint and auto-posting.
// Always returns text — falls back to a static variant if the LLM is down or slips
// into banned slang, so posting is never blocked by the model.

const URL = 'https://benzinradar.com'

const REFERENCES = [
  'нашёл карту, где люди отмечают наличие топлива на АЗС. можно быстро глянуть и при желании добавить свою отметку.',
  'нашёл карту наличия бензина на АЗС. если кто-то сегодня заправлялся — можно отметить свою заправку, чтобы другим было проще ориентироваться.',
  'здесь можно посмотреть наличие топлива на АЗС. карта пополняется самими водителями, чем больше отметок, тем точнее.',
]

const SYSTEM = [
  'Ты пишешь ОДНО короткое сообщение для телеграм-чата водителей/такси — спокойно и по делу,',
  'как взрослый человек, который нашёл полезную карту наличия топлива на АЗС и делится ей.',
  'Тон: ровный, естественный, для взрослой аудитории. БЕЗ молодёжного сленга и слов-паразитов',
  '(никаких «народ», «пацаны», «мужики», «ребят», «парни», «кста», «чекай», «движ», «штука», «кидайте», «го»).',
  'НЕ обращайся к участникам чата напрямую и без вокативов — это нейтральное сообщение, не призыв.',
  'Без эмодзи, без рекламного пафоса и без канцелярита. Простой ясный язык, можно со строчной буквы.',
  '1–2 коротких предложения. Суть: это карта наличия бензина/топлива на заправках,',
  'её пополняют сами водители — чем больше отметок, тем точнее; можно отметить свою заправку.',
  `В конце — ссылка ${URL} с НОВОЙ строки.`,
  'Ориентируйся на стиль примеров ниже (тот же регистр), но формулируй КАЖДЫЙ раз по-новому.',
  'Примеры тона:',
  ...REFERENCES.map((r) => `— ${r}`),
  'Выведи ТОЛЬКО текст сообщения, без кавычек и пояснений.',
].join('\n')

const ANGLES = [
  'сделай акцент на том, что данные собирают сами водители',
  'сделай акцент на пользе в период дефицита топлива',
  'сделай акцент на том, что можно отметить свою заправку и помочь другим',
  'начни с того, что наткнулся на это случайно',
  'сделай максимально лаконично, в одно предложение',
  'сделай нейтрально-информативным, как короткая заметка',
]

const BANNED = /народ|пацан|мужик|ребят|\bпарни\b|\bкста\b|чека[йю]|\bдвиж|\bштук[ауи]|кидай|погнал|зацен|\bйоу\b|\bго\b/i

export function fallbackMessage(): string {
  return MESSAGE_VARIANTS[Math.floor(Math.random() * MESSAGE_VARIANTS.length)]
}

function clean(raw: string): string {
  let t = raw.trim().replace(/^["'«»]+|["'«»]+$/g, '').trim()
  if (!t) return fallbackMessage()
  if (!t.toLowerCase().includes('benzinradar.com')) t = `${t}\n\n${URL}`
  return t
}

export interface GeneratedMessage { text: string; source: string }

export async function generateMessage(): Promise<GeneratedMessage> {
  try {
    const provider = getLlmProvider()
    for (let attempt = 0; attempt < 2; attempt++) {
      const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]
      const raw = await provider.complete([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Сгенерируй свежую вариацию. ${angle}.` },
      ])
      const out = clean(raw)
      if (!BANNED.test(out)) return { text: out, source: provider.name }
    }
    return { text: fallbackMessage(), source: 'fallback-clean' }
  } catch (err) {
    console.error('[genMessage] llm failed, using fallback:', err instanceof Error ? err.message : err)
    return { text: fallbackMessage(), source: 'fallback' }
  }
}
