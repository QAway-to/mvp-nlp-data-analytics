import type { ChatMessage, LlmProvider } from './provider'

interface ProviderConfig {
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

const LLM_TIMEOUT_MS = 60_000

// One implementation for any OpenAI-compatible /chat/completions endpoint
// (DeepSeek, OpenRouter, …). Only base url + key + model differ.
export function makeOpenAiCompatibleProvider(cfg: ProviderConfig): LlmProvider {
  return {
    name: cfg.name,
    async complete(messages: ChatMessage[], opts?: { jsonMode?: boolean }): Promise<string> {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          ...(opts?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`LLM ${cfg.name} error ${res.status}: ${err.slice(0, 200)}`)
      }
      const data = await res.json() as { choices?: { message?: { content?: string } }[] }
      return data?.choices?.[0]?.message?.content ?? ''
    },
  }
}
