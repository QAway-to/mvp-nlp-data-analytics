import { GoogleGenerativeAI } from '@google/generative-ai';

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

export async function streamNLQuery(query: string, dataSchema: string[], sampleData: any) {
    try {
        console.log('[Gemini] Streaming query:', query);
        const apiKey = validateApiKey();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const schemaDescription = generateSchemaDescription(dataSchema, sampleData);

        const prompt = `Ты - эксперт по анализу данных. Пользователь задал вопрос о данных.

Схема данных:
${schemaDescription}

Пример данных:
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Вопрос: "${query}"

ЗАДАЧА:
1. Сначала дай текстовое объяснение того, что ты собираешься показать или проанализировать.
2. Затем верни JSON блок с параметрами для визуализации или статистики.

ФОРМАТ ОТВЕТА (Строго соблюдай порядок):
Сначала просто текст c объяснением (Markdown допустим).
Затем разделитель: "---JSON---"
Затем валидный JSON:
{
  "type": "statistics" | "visualization" | "correlations" | "sql" | "text",
  "statistics": ["mean", "count", ...] (если type="statistics"),
  "visualization": {
    "chartType": "line" | "bar" | "pie" | "scatter",
    "xAxis": "col_name",
    "yAxis": "col_name"
  },
  "insights": [ ... ]
}
`;

        const result = await model.generateContentStream(prompt);
        return result;

    } catch (error: any) {
        console.error('[Gemini] Error:', error);
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}
