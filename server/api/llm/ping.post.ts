import { getLlmProvider } from '~/server/llm/provider'

// Secret-protected real round-trip to the configured LLM (costs ~nothing).
// Confirms the key works AND the balance is non-zero.
export default defineEventHandler(async (event) => {
  requireSecret(event)
  const provider = getLlmProvider()
  const startedAt = Date.now()
  try {
    const reply = await provider.complete(
      [{ role: 'user', content: 'Reply with exactly: OK' }],
    )
    return { ok: true, provider: provider.name, latencyMs: Date.now() - startedAt, reply: reply.slice(0, 80) }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'LLM call failed'
    throw createError({ statusCode: 502, message })
  }
})
