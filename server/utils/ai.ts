import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

interface GeminiResponse {
    type: 'statistics' | 'visualization' | 'correlations' | 'sql' | 'text';
    statistics?: string[];
    visualization?: {
        chartType: 'line' | 'bar' | 'pie' | 'scatter';
        xAxis: string;
        yAxis: string;
    };
    description: string;
    message: string;
    insights?: Array<{
        type: 'pattern' | 'anomaly' | 'trend' | 'recommendation';
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
    }>;
}

function validateApiKey() {
    const config = useRuntimeConfig();
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not set');
    }
    return apiKey;
}

function generateSchemaDescription(schema: string[], sampleData: any[]) {
    if (!schema || schema.length === 0) {
        return 'Нет данных';
    }

    let description = 'Колонки:\n';
    schema.forEach(col => {
        const sampleValue = sampleData[0]?.[col] ?? 'N/A';
        description += `- ${col}: пример значения "${sampleValue}"\n`;
    });

    description += `\nВсего строк: ${sampleData.length}`;
    return description;
}

export async function processNLQuery(query: string, dataSchema: string[], sampleData: any[]): Promise<GeminiResponse> {
    try {
        console.log('[Gemini] Processing query:', query);
        validateApiKey();

        const model = google('models/gemini-2.5-flash');
        const schemaDescription = generateSchemaDescription(dataSchema, sampleData);

        const prompt = `Ты - эксперт по анализу данных. Пользователь задал вопрос о данных.

Схема данных:
${schemaDescription}

Пример данных:
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Вопрос: "${query}"

ЗАДАЧА:
1. Проанализируй вопрос и данные.
2. Определи тип анализа (statistics, visualization, correlations, anomalies).
3. Дай понятное объяснение и инсайты.

Верни ТОЛЬКО валидный JSON:
{
  "type": "statistics" | "visualization" | "correlations" | "sql" | "text",
  "statistics": ["mean", "count", ...] (если type="statistics"),
  "visualization": {
    "chartType": "line" | "bar" | "pie" | "scatter",
    "xAxis": "col_name",
    "yAxis": "col_name"
  },
  "description": "Краткое описание",
  "message": "Подробный ответ пользователю",
  "insights": [
    {
      "type": "pattern" | "anomaly" | "trend" | "recommendation",
      "title": "Заголовок",
      "description": "Описание",
      "severity": "low" | "medium" | "high"
    }
  ]
}`;

        const { text } = await generateText({
            model: model,
            prompt: prompt,
        });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as GeminiResponse;
        }

        return {
            type: 'text',
            message: text,
            description: 'Анализ выполнен'
        };

    } catch (error: any) {
        console.error('[Gemini] Error:', error);
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}
