
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { query, data, columns } = body;

    if (!query) throw createError({ statusCode: 400, message: 'Query is required' });
    if (!data || !data.length) throw createError({ statusCode: 400, message: 'Data is required' });

    // 1. Initiate Streaming
    const geminiStream = await streamNLQuery(query, columns, data.slice(0, 10));

    return sendStream(event, new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let accumulatedJson = '';
            let jsonStarted = false;

            try {
                for await (const chunk of geminiStream.stream) {
                    const text = chunk.text();

                    if (jsonStarted) {
                        accumulatedJson += text;
                        continue;
                    }

                    if (text.includes('---JSON---')) {
                        const [textPart, jsonPart] = text.split('---JSON---');
                        if (textPart.trim()) {
                            controller.enqueue(encoder.encode(`T:${textPart}`));
                        }
                        accumulatedJson += jsonPart;
                        jsonStarted = true;
                    } else {
                        // Regular text chunk
                        controller.enqueue(encoder.encode(`T:${text}`));
                    }
                }

                // 2. Process Buffered JSON
                if (accumulatedJson.trim()) {
                    try {
                        // Clean JSON markdown if present
                        const cleanJson = accumulatedJson.replace(/```json/g, '').replace(/```/g, '').trim();
                        const geminiResponse = JSON.parse(cleanJson);

                        // 3. Calculate Backend Stats based on Intent
                        let additionalData: any = {};

                        if (geminiResponse.type === 'statistics') {
                            const stats: Record<string, any> = {};
                            const targetCols = geminiResponse.statistics?.length
                                ? geminiResponse.statistics
                                : columns.filter((c: string) => detectColumnTypes(data, [c])[c] === 'number');

                            targetCols.forEach((col: string) => {
                                if (detectColumnTypes(data, [col])[col] === 'number') {
                                    const stat = calculateStatistics(data, col);
                                    if (stat) stats[col] = stat;
                                }
                            });
                            additionalData.statistics = stats;
                            // Default chart
                            additionalData.chart = {
                                type: 'bar',
                                data: Object.entries(stats).map(([k, v]: [string, any]) => ({ name: k, value: v.mean })),
                                xKey: 'name',
                                yKey: 'value'
                            }
                        } else if (geminiResponse.type === 'visualization') {
                            const { chartType, xAxis, yAxis } = geminiResponse.visualization!;
                            const chartData = data.map((row: any) => ({
                                [xAxis]: row[xAxis],
                                [yAxis]: parseFloat(row[yAxis]) || 0
                            })).slice(0, 100);

                            additionalData.chart = {
                                type: chartType,
                                data: chartData,
                                xKey: xAxis,
                                yKey: yAxis
                            };
                        } else if (geminiResponse.type === 'correlations') {
                            additionalData.correlations = calculateCorrelations(data, columns);
                        }

                        const finalResult = {
                            ...geminiResponse,
                            ...additionalData
                        };

                        controller.enqueue(encoder.encode(`D:${JSON.stringify(finalResult)}`));

                    } catch (e) {
                        console.error('JSON Parse Error:', e);
                        controller.enqueue(encoder.encode(`T:\n[System Error: Could not parse analysis data]`));
                    }
                }
            } catch (err) {
                console.error('Stream Error:', err);
                controller.enqueue(encoder.encode(`T:\n[Error processing request]`));
            } finally {
                controller.close();
            }
        }
    }));
});
