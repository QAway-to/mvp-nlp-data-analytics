
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { query, data, columns } = body;

    if (!query) throw createError({ statusCode: 400, message: 'Query is required' });
    if (!data || !data.length) throw createError({ statusCode: 400, message: 'Data is required' });

    // 1. Process query with Gemini
    const geminiResponse = await processNLQuery(query, columns, data.slice(0, 10));

    // 2. Process data based on AI intent
    let additionalData: any = {};

    if (geminiResponse.type === 'statistics') {
        const stats: Record<string, any> = {};
        const targetCols = geminiResponse.statistics?.length
            ? geminiResponse.statistics
            : columns.filter(c => detectColumnTypes(data, [c])[c] === 'number');

        targetCols.forEach((col: string) => {
            // In real logic, we'd filter only numeric columns first to avoid calc stats on strings
            if (detectColumnTypes(data, [col])[col] === 'number') {
                const stat = calculateStatistics(data, col);
                if (stat) stats[col] = stat;
            }
        });

        additionalData.statistics = stats;

        // Also create a default chart if mean values exist
        additionalData.chart = {
            type: 'bar',
            data: Object.entries(stats).map(([k, v]: [string, any]) => ({ name: k, value: v.mean })),
            xKey: 'name',
            yKey: 'value'
        }
    } else if (geminiResponse.type === 'visualization') {
        const { chartType, xAxis, yAxis } = geminiResponse.visualization!;

        // Basic aggregation for charts
        // For MVP we simply return raw data mapped, in real app need grouping logic similar to legacy
        const chartData = data.map(row => ({
            [xAxis]: row[xAxis],
            [yAxis]: parseFloat(row[yAxis]) || 0
        })).slice(0, 100); // Limit points for performance

        additionalData.chart = {
            type: chartType,
            data: chartData,
            xKey: xAxis,
            yKey: yAxis
        };
    } else if (geminiResponse.type === 'correlations') {
        additionalData.correlations = calculateCorrelations(data, columns);
    }

    return {
        ...geminiResponse,
        ...additionalData,
        logs: [
            { timestamp: new Date().toISOString(), message: `Processed query: ${query}` },
            { timestamp: new Date().toISOString(), message: `AI Intent: ${geminiResponse.type}` }
        ]
    };
});
