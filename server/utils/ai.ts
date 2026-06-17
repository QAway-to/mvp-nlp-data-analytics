const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-oss-120b:free'

function getApiKey(): string {
  const config = useRuntimeConfig()
  const key = config.openrouterApiKey || process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY not set')
  return key as string
}

function generateSchemaDescription(schema: string[], sampleData: any[]): string {
  if (!schema || schema.length === 0) return 'No data'
  let desc = 'Columns:\n'
  schema.forEach(col => {
    const sample = sampleData[0]?.[col] ?? 'N/A'
    desc += `- ${col}: example value "${sample}"\n`
  })
  desc += `\nTotal rows: ${sampleData.length}`
  return desc
}

export async function* streamNLQuery(
  query: string,
  dataSchema: string[],
  sampleData: any[]
): AsyncGenerator<string> {
  const apiKey = getApiKey()
  const schemaDescription = generateSchemaDescription(dataSchema, sampleData)

  const prompt = `You are a data analysis expert. The user asked a question about their data.

Data schema:
${schemaDescription}

Sample data:
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Question: "${query}"

TASK:
1. First give a brief text explanation of what you will show or analyze.
2. Then return a JSON block with parameters for visualization or statistics.

RESPONSE FORMAT (strictly follow this order):
First: plain text explanation (Markdown allowed).
Then the delimiter: "---JSON---"
Then valid JSON:
{
  "type": "statistics" | "visualization" | "correlations" | "sql" | "text",
  "statistics": ["mean", "count", ...] (if type="statistics"),
  "visualization": {
    "chartType": "line" | "bar" | "pie" | "scatter",
    "xAxis": "col_name",
    "yAxis": "col_name"
  },
  "insights": [ ... ]
}`

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenRouter API error ${res.status}: ${err.slice(0, 300)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') return
        try {
          const parsed = JSON.parse(raw)
          const content: string | undefined = parsed?.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // skip malformed SSE chunk
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}