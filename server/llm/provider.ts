import { makeOpenAiCompatibleProvider } from './openaiCompatible'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export interface LlmProvider {
  readonly name: string
  complete(messages: ChatMessage[], opts?: { jsonMode?: boolean }): Promise<string>
}

// Env-driven factory. DeepSeek primary (paid, no longer the bottleneck),
// free OpenRouter as fallback. Both speak the OpenAI /chat/completions format.
export function getLlmProvider(): LlmProvider {
  const cfg = useRuntimeConfig()

  const deepSeekKey = process.env.DEEP_SEEK_API_KEY || process.env.DEEP_SEEK || cfg.deepSeekKey
  if (deepSeekKey) {
    return makeOpenAiCompatibleProvider({
      name: 'deepseek',
      baseUrl: process.env.LLM_BASE_URL || cfg.llmBaseUrl || 'https://api.deepseek.com',
      apiKey: deepSeekKey,
      model: process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL || cfg.llmModel || 'deepseek-chat',
    })
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY || cfg.openrouterApiKey
  if (openrouterKey) {
    return makeOpenAiCompatibleProvider({
      name: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: openrouterKey,
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free',
    })
  }

  throw new Error('No LLM provider configured (set DEEP_SEEK or OPENROUTER_API_KEY)')
}
