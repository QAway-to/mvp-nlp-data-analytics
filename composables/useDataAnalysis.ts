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

        try {
            const result = await $fetch<AnalysisResult>('/api/query', {
                method: 'POST',
                body: {
                    query: queryText,
                    data: data.value, // In prod, might want to send only schema or sample if data is huge
                    columns: columns.value
                }
            });

            analysisResult.value = result;

            // Add to history
            queryHistory.value.unshift({
                id: Date.now(),
                query: queryText,
                timestamp: new Date(),
                resultType: result.type
            });

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
