import type { ContactType } from '~/types/pipeline'

export interface ExtractedContact {
  type: ContactType
  handle: string
}

// Order matters: telegram > email > phone (most specific first)
// Exclude invite/utility paths (joinchat, +hash, s/, share, addstickers, proxy) — they are not user handles.
const TELEGRAM_RE = /(?:^|[\s,;(])(?:@([A-Za-z0-9_]{5,32})|t\.me\/(?!joinchat\b|s\/|share\b|addstickers\b|proxy\b)([A-Za-z0-9_]{5,32}))/
const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/
// Russian mobile and international formats
const PHONE_RE = /(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|\+[1-9]\d{7,14}/

export function extractContact(text: string): ExtractedContact | null {
  const tgMatch = text.match(TELEGRAM_RE)
  if (tgMatch) {
    const handle = tgMatch[1] ?? tgMatch[2]
    return { type: 'telegram', handle }
  }

  const emailMatch = text.match(EMAIL_RE)
  if (emailMatch) {
    return { type: 'email', handle: emailMatch[0] }
  }

  const phoneMatch = text.match(PHONE_RE)
  if (phoneMatch) {
    return { type: 'phone', handle: phoneMatch[0] }
  }

  return null
}

export function normalizeHandle(type: ContactType, handle: string): string {
  switch (type) {
    case 'telegram': {
      // Remove leading @ or t.me/ prefix, then lowercase
      const stripped = handle.replace(/^(?:@|t\.me\/)/, '')
      return stripped.toLowerCase()
    }
    case 'email': {
      return handle.toLowerCase()
    }
    case 'phone': {
      // Keep only digits and a leading +
      const digits = handle.replace(/[^\d+]/g, '')
      // Normalize Russian 8-xxx to +7-xxx
      if (digits.startsWith('8') && digits.length === 11) {
        return '+7' + digits.slice(1)
      }
      return digits
    }
    case 'whatsapp': {
      return handle.replace(/[^\d+]/g, '')
    }
    case 'url': {
      return handle.trim()
    }
  }
}
