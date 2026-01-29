import { ref, computed } from 'vue';
import Papa from 'papaparse';
import Papa from 'papaparse';

export interface DataColumn {
    name: string;
    type: string;
}

export const useDataAnalysis = () => {
    const data = ref<any[]>([]);
    const columns = ref<string[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Analysis results
    const analysisResult = ref<any>(null);
    const queryHistory = ref<any[]>([]);

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
            const result = await $fetch('/api/query', {
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

    return {
        data,
        columns,
        isLoading,
        error,
        totalRows,
        numericColumns,
        analysisResult,
        queryHistory,
        handleFileUpload,
        processQuery
    };
};
