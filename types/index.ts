export interface DataColumn {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
}

export interface ChartDataPoint {
    [key: string]: string | number;
}

export interface ChartConfig {
    type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar';
    data: ChartDataPoint[];
    xKey: string;
    yKey: string;
    title?: string;
    description?: string;
}

export interface AnalysisInsight {
    type: 'anomaly' | 'trend' | 'pattern' | 'recommendation';
    title: string;
    description: string;
    confidence?: number;
}

export interface AnalysisResult {
    type: 'statistics' | 'visualization' | 'correlations' | 'general';
    message: string;
    insights?: AnalysisInsight[];
    chart?: ChartConfig;
    statistics?: Record<string, {
        mean?: number;
        median?: number;
        min?: number;
        max?: number;
        stdDev?: number;
        nullCount?: number;
        uniqueCount?: number;
    }>;
    correlations?: Record<string, number>;
    logs?: Array<{ timestamp: string; message: string }>;
}

export interface SavedReport {
    id: string;
    title: string;
    date: string;
    result: AnalysisResult;
    query: string;
    projectId?: string;
}

export interface SavedDataset {
    id: string;
    name: string;
    date: string;
    data: any[];
    columns: string[];
}

export interface QueryHistoryItem {
    id: number;
    query: string;
    timestamp: Date;
    resultType: AnalysisResult['type'];
}
