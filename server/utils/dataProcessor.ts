export function detectColumnTypes(data: any[], columns: string[]) {
    const types: Record<string, string> = {};
    const sampleSize = Math.min(data.length, 50);

    columns.forEach(col => {
        let isNumber = true;
        let isDate = true;
        let hasValues = false;

        for (let i = 0; i < sampleSize; i++) {
            const val = data[i][col];
            if (val === null || val === undefined || val === '') continue;
            hasValues = true;

            const numVal = parseFloat(val);
            if (isNaN(numVal)) isNumber = false;

            if (isNaN(Date.parse(val)) && !/^\d{4}-\d{2}-\d{2}/.test(val)) isDate = false;
        }

        if (!hasValues) types[col] = 'string';
        else if (isNumber) types[col] = 'number';
        else if (isDate) types[col] = 'date';
        else types[col] = 'string';
    });
    return types;
}

export function calculateStatistics(data: any[], column: string) {
    const values = data
        .map(row => parseFloat(row[column]))
        .filter(v => !isNaN(v))
        .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const min = values[0];
    const max = values[values.length - 1];
    const median = values[Math.floor(values.length / 2)];

    // Variance & StdDev
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { count: values.length, mean, median, min, max, stdDev, variance };
}

export function calculateCorrelations(data: any[], columns: string[]) {
    const numericCols = columns.filter(c => detectColumnTypes(data, [c])[c] === 'number');
    if (numericCols.length < 2) return null;

    const correlations: any[] = [];

    // Prepare column data arrays
    const colData: Record<string, number[]> = {};
    numericCols.forEach(col => {
        colData[col] = data.map(r => parseFloat(r[col]) || 0);
    });

    for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
            const col1 = numericCols[i];
            const col2 = numericCols[j];

            const vals1 = colData[col1];
            const vals2 = colData[col2];

            const mean1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
            const mean2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;

            let num = 0, den1 = 0, den2 = 0;
            for (let k = 0; k < vals1.length; k++) {
                const dx = vals1[k] - mean1;
                const dy = vals2[k] - mean2;
                num += dx * dy;
                den1 += dx * dx;
                den2 += dy * dy;
            }

            const r = den1 && den2 ? num / Math.sqrt(den1 * den2) : 0;
            correlations.push({ col1, col2, value: Number(r.toFixed(4)) });
        }
    }
    return correlations;
}
