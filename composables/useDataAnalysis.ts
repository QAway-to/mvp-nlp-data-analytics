import { ref, computed } from 'vue';
import Papa from 'papaparse';
import { useLocalStorage } from '@vueuse/core';
import type { AnalysisResult, QueryHistoryItem, SavedReport, DataColumn } from '~/types';

export const useDataAnalysis = () => {
    const data = ref<any[]>([]);
    const columns = ref<string[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Analysis results
    const analysisResult = ref<AnalysisResult | null>(null);
    const queryHistory = ref<QueryHistoryItem[]>([]);

    // Persistence
    const savedReports = useLocalStorage<SavedReport[]>('here-crm-reports', []);
    const savedDatasets = useLocalStorage<SavedDataset[]>('here-crm-datasets', []);

    const totalRows = computed(() => data.value.length);
    const numericColumns = computed(() => {
        if (!data.value.length) return [];
        // Simple heuristic
        return columns.value.filter(col => {
            return data.value.every(row => !isNaN(parseFloat(row[col])));
        });
    });

    const handleFileUpload = async (file: File) => {
        isLoading.value = true;
        error.value = null;

        try {
            if (file.name.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        data.value = results.data;
                        columns.value = results.meta.fields || [];
                        isLoading.value = false;
                    },
                    error: (err) => {
                        error.value = `CSV Error: ${err.message}`;
                        isLoading.value = false;
                    }
                });
            } else if (file.name.match(/\.xlsx?$/)) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const XLSX = await import('xlsx');
                        const bstr = e.target?.result;
                        const wb = XLSX.read(bstr, { type: 'binary' });
                        const wsname = wb.SheetNames[0];
                        const ws = wb.Sheets[wsname];
                        const jsonData = XLSX.utils.sheet_to_json(ws);

                        if (jsonData.length > 0) {
                            data.value = jsonData;
                            columns.value = Object.keys(jsonData[0] as object);
                        }
                        isLoading.value = false;
                    } catch (e: any) {
                        error.value = `Excel Error: ${e.message}`;
                        isLoading.value = false;
                    }
                };
                reader.readAsBinaryString(file);
            } else {
                error.value = 'Unsupported file format';
                isLoading.value = false;
            }
        } catch (e: any) {
            error.value = e.message;
            isLoading.value = false;
        }
    };

    const processQuery = async (queryText: string) => {
        if (!queryText.trim()) return;
        if (data.value.length === 0) {
            error.value = 'Сначала загрузите данные';
            return;
        }

        isLoading.value = true;
        error.value = null;

        // Initial empty state for streaming
        analysisResult.value = {
            type: 'text',
            description: 'Analyzing...',
            message: '',
        };

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: queryText,
                    data: data.value,
                    columns: columns.value
                })
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let loop = true;

            while (loop) {
                const { done, value } = await reader.read();
                if (done) {
                    loop = false;
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                // Simple parsing assuming chunks often arrive mostly intact or concatenated
                // We split by standard markers T: and D:
                // A better protocol would be SSE, but this works for MVP HTTP streaming

                // We simply look for our prefixes. 
                // Since T: text might contain "D:", we rely on the fact that D: is sent as a distinct final block usually.
                // However, to be safe against concatenation: T:HelloT:World

                // regex to find all matches of (Start or T:|D:)
                const parts = chunk.split(/(?=[TD]:)/);

                for (const part of parts) {
                    if (part.startsWith('T:')) {
                        analysisResult.value.message += part.substring(2);
                    } else if (part.startsWith('D:')) {
                        try {
                            const jsonData = JSON.parse(part.substring(2));
                            // Merge the final structured data
                            analysisResult.value = {
                                ...analysisResult.value,
                                ...jsonData,
                                // Keep the accumulated message if the JSON one is empty or just generic
                                message: analysisResult.value.message
                            };

                            // Add to history
                            queryHistory.value.unshift({
                                id: Date.now(),
                                query: queryText,
                                timestamp: new Date(),
                                resultType: jsonData.type
                            });
                        } catch (e) {
                            console.error('Error parsing final data:', e);
                        }
                    }
                }
            }

        } catch (e: any) {
            console.error(e);
            error.value = e.message || 'Ошибка обработки запроса';
        } finally {
            isLoading.value = false;
        }
    };

    const saveCurrentReport = (title: string) => {
        if (!analysisResult.value) return;
        savedReports.value.push({
            id: crypto.randomUUID(),
            title: title || `Report ${new Date().toLocaleDateString()}`,
            date: new Date().toISOString(),
            result: analysisResult.value,
            query: queryHistory.value[0]?.query || 'Manual Analysis'
        });
    };

    const deleteReport = (id: string) => {
        savedReports.value = savedReports.value.filter(r => r.id !== id);
    };

    const loadReport = (report: SavedReport) => {
        analysisResult.value = report.result;
    };

    const saveDataset = (name: string) => {
        if (!data.value.length) return;
        savedDatasets.value.push({
            id: crypto.randomUUID(),
            name: name || `Dataset ${new Date().toLocaleDateString()}`,
            date: new Date().toISOString(),
            data: data.value,
            columns: columns.value
        });
    };

    const deleteDataset = (id: string) => {
        savedDatasets.value = savedDatasets.value.filter(d => d.id !== id);
    };

    const loadDataset = (dataset: SavedDataset) => {
        data.value = dataset.data;
        columns.value = dataset.columns;
        analysisResult.value = null; // Reset analysis when loading new data
        error.value = null;
    };

    return {
        data,
        columns,
        isLoading,
        error,
        totalRows,
        numericColumns,
        analysisResult,
        queryHistory,
        savedReports,
        handleFileUpload,
        processQuery,
        saveCurrentReport,
        deleteReport,
        loadReport,
        savedDatasets,
        saveDataset,
        deleteDataset,
        loadDataset
    };
};
