import { createError } from 'h3'
import type { SourceAdapter, AdapterContext } from './types'
import type { RawListing, SourceConfig } from '~/types/pipeline'
import { stripHtml } from '~/server/utils/leads'

// Public broadcast channels via the t.me/s/ web mirror. No account needed.
// Per-message author handles are NOT available here (that needs MTProto/GramJS);
// the implied contact is the channel itself (Telegram-reachable).

const CHANNEL_RE = /^[a-zA-Z0-9_]{1,32}$/
const MSG_TEXT_RE = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g
const MSG_URL_RE = /class="tgme_widget_message_date"[^>]*href="([^"]+)"/g

function channelName(url: string): string {
  return url.replace(/^@/, '').replace(/https?:\/\/t\.me\/(s\/)?/g, '').replace(/\/.*$/, '').trim()
}

// message id is the last path segment of the permalink (t.me/<chan>/<id>)
function msgIdFromUrl(url: string | null, fallback: number): string {
  if (!url) return String(fallback)
  const m = url.match(/\/(\d+)\/?$/)
  return m ? m[1] : String(fallback)
}

export const telegramWebAdapter: SourceAdapter = {
  key: 'telegramWeb',

  async fetch(config: SourceConfig, ctx: AdapterContext): Promise<RawListing[]> {
    const name = channelName(config.url)
    if (!CHANNEL_RE.test(name)) {
      throw createError({ statusCode: 400, message: `Invalid Telegram channel: ${config.url}` })
    }

    const html = await ctx.fetchText(`https://t.me/s/${name}`)
    if (!html.includes('tgme_widget_message_bubble')) {
      ctx.logger.warn(`@${name} private or empty`)
      return []
    }

    const texts = [...html.matchAll(MSG_TEXT_RE)].map(m => stripHtml(m[1])).filter(t => t.length > 15)
    const urls = [...html.matchAll(MSG_URL_RE)].map(m => m[1])

    return texts.slice(0, 100).map((text, i): RawListing => {
      const url = urls[i] ?? null
      return {
        sourceItemId: msgIdFromUrl(url, i),
        url,
        title: null,
        text,
        postedAt: null,
        impliedContact: { type: 'telegram', handle: name.toLowerCase() },
      }
    })
  },
}
