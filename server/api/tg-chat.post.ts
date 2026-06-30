import { getLlmProvider } from '~/server/llm/provider'

// ── Промпт для Telegram-чата (меняй здесь) ───────────────────────────────────
const TG_SYSTEM_PROMPT = `Ты — умный ассистент. Отвечай на русском языке, кратко и по делу.`
// ─────────────────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

export default defineEventHandler(async (event) => {
  if (!BOT_TOKEN) throw createError({ statusCode: 500, message: 'TELEGRAM_BOT_TOKEN not set' })

  const update = await readBody(event)
  const message = update?.message
  const text: string | undefined = message?.text
  const chatId: number | undefined = message?.chat?.id

  if (!text || !chatId) return { ok: true }

  const llm = getLlmProvider()
  const reply = await llm.complete([
    { role: 'system', content: TG_SYSTEM_PROMPT },
    { role: 'user', content: text },
  ])

  await sendMessage(chatId, reply || '⚠️ Нет ответа')
  return { ok: true }
})
