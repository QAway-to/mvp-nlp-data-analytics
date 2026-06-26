import { stripHtml } from './leads'
import { fetchTme, parseHandle, isValidHandle } from './tmeCheck'

// Confirm a placement is still live (task: "убеждаться что сообщение прошло и не
// удалено"). Reads a message's public embed: a present bubble ⇒ alive, an error
// marker ⇒ deleted. Shared by the verify endpoint and the post-send auto-check.

export type MessageState = 'alive' | 'deleted' | 'unknown'

export interface MessageVerification {
  chat: string
  messageId: number
  url: string
  state: MessageState
  verifiable: boolean
  text: string | null
  checkedAt: string
}

const MAX_TG_MESSAGE_ID = 2_147_483_647 // Telegram message ids are 32-bit signed

// Extract <chat, id> from any t.me message link form.
export function parseMessageRef(input: string): { chat: string; messageId: number } | null {
  const cleaned = input.trim().replace(/^https?:\/\//, '').replace(/^t\.me\//i, '').replace(/^s\//, '')
  const m = cleaned.match(/^([a-zA-Z0-9_]+)\/(\d+)/)
  if (!m) return null
  return { chat: parseHandle(m[1]), messageId: Number(m[2]) }
}

// Returns null when the link is unparseable/invalid (caller maps to 400).
export async function verifyMessage(input: string): Promise<MessageVerification | null> {
  const ref = parseMessageRef(input)
  if (!ref || !isValidHandle(ref.chat) || !Number.isInteger(ref.messageId) ||
      ref.messageId <= 0 || ref.messageId > MAX_TG_MESSAGE_ID) {
    return null
  }

  const url = `https://t.me/${ref.chat}/${ref.messageId}`
  const { ok, html } = await fetchTme(`${url}?embed=1&mode=tme`)
  const checkedAt = new Date().toISOString()
  const base = { chat: ref.chat, messageId: ref.messageId, url, checkedAt }

  if (!ok || html.length === 0) return { ...base, state: 'unknown', verifiable: false, text: null }

  // Telegram renders a not-found/removed message with an explicit error block.
  if (/tgme_widget_message_error|message not found|post not found/i.test(html)) {
    return { ...base, state: 'deleted', verifiable: true, text: null }
  }

  if (!/tgme_widget_message(_bubble|_text|\s)/.test(html)) {
    // Chat doesn't expose this message publicly — can't judge; keep a screenshot.
    return { ...base, state: 'unknown', verifiable: false, text: null }
  }

  const textMatch = html.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/)
  return { ...base, state: 'alive', verifiable: true, text: textMatch ? stripHtml(textMatch[1]) : null }
}
