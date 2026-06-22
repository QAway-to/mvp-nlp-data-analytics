// Public, zero-cost config presence check. Leaks no secret values — only booleans.
export default defineEventHandler(() => {
  const cfg = useRuntimeConfig()
  const hasDeepSeek = !!(process.env.DEEP_SEEK || cfg.deepSeekKey)
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || cfg.openrouterApiKey)
  return {
    ok: true,
    db: !!(process.env.DATABASE_URL || cfg.databaseUrl),
    cronSecret: !!(process.env.CRON_SECRET || cfg.cronSecret),
    llmProvider: hasDeepSeek ? 'deepseek' : hasOpenRouter ? 'openrouter' : null,
    llmModel: process.env.LLM_MODEL || cfg.llmModel || (hasDeepSeek ? 'deepseek-chat' : null),
  }
})
