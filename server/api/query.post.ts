import { streamNLQuery } from '../utils/ai'
import { detectColumnTypes, calculateStatistics, calculateCorrelations } from '../utils/dataProcessor'

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { query, data, columns } = body;

    if (!query) throw createError({ statusCode: 400, message: 'Query is required' });
    if (!data || !data.length) throw createError({ statusCode: 400, message: 'Data is required' });

    const stream = streamNLQuery(query, columns, data.slice(0, 10));

    return sendStream(event, new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let accumulatedJson = '';
            let jsonStarted = false;

            try {
                for await (const text of stream) {
                    if (jsonStarted) {
                        accumulatedJson += text;
                        continue;
                    }

                    if (text.includes('---JSON---')) {
                        const [textPart, jsonPart] = text.split('---JSON---');
                        if (textPart.trim()) {
                            controller.enqueue(encoder.encode(`T:${textPart}`));
                        }
                        accumulatedJson += jsonPart ?? '';
                        jsonStarted = true;
                    } else {
                        controller.enqueue(encoder.encode(`T:${text}`));
                    }
                }

                if (accumulatedJson.trim()) {
                    try {
                        const cleanJson = accumulatedJson.replace(/```json/g, '').replace(/```/g, '').trim();
                        const parsed = JSON.parse(cleanJson);

                        let additionalData: any = {};

                        if (parsed.type === 'statistics') {
                            const stats: Record<string, any> = {};
                            const targetCols = parsed.statistics?.length
                                ? parsed.statistics
                                : columns.filter((c: string) => detectColumnTypes(data, [c])[c] === 'number');

                            targetCols.forEach((col: string) => {
                                if (detectColumnTypes(data, [col])[col] === 'number') {
                                    const stat = calculateStatistics(data, col);
                                    if (stat) stats[col] = stat;
                                }
                            });
                            additionalData.statistics = stats;
                            additionalData.chart = {
                                type: 'bar',
                                data: Object.entries(stats).map(([k, v]: [string, any]) => ({ name: k, value: v.mean })),
                                xKey: 'name',
                                yKey: 'value'
                            };
                        } else if (parsed.type === 'visualization') {
                            const { chartType, xAxis, yAxis } = parsed.visualization!;
                            additionalData.chart = {
                                type: chartType,
                                data: data.map((row: any) => ({
                                    [xAxis]: row[xAxis],
                                    [yAxis]: parseFloat(row[yAxis]) || 0
                                })).slice(0, 100),
                                xKey: xAxis,
                                yKey: yAxis
                            };
                        } else if (parsed.type === 'correlations') {
                            additionalData.correlations = calculateCorrelations(data, columns);
                        }

                        controller.enqueue(encoder.encode(`D:${JSON.stringify({ ...parsed, ...additionalData })}`));

                    } catch (e) {
                        console.error('JSON Parse Error:', e);
                        controller.enqueue(encoder.encode(`T:\n[System Error: Could not parse analysis data]`));
                    }
                }
            } catch (err: any) {
                console.error('Stream Error:', err);
                controller.enqueue(encoder.encode(`T:\n[Error: ${err?.message ?? 'Processing failed'}]`));
            } finally {
                controller.close();
            }
        }
    }));
});