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

// CRM Models
export interface Deal {
    id: string; // UUID
    title: string;
    company: string;
    value: number;
    currency: string;
    status: 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
    type: 'B2B' | 'B2C';
    manager_id: string; // UUID
    created_at: Date;
    nlp_analysis?: {
        risk_score: number;
        summary_sentiment: 'positive' | 'neutral' | 'negative';
        [key: string]: any;
    };
    // CRM Fields
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    cemetery_name?: string;
    permit_date?: Date;
    payment_type?: '3_parts' | '2_parts' | 'full'; // 3_parts=35/35/30, 2_parts=50/50
    last_activity_date?: Date;
    next_activity_date?: Date;
    next_activity_type?: 'call' | 'email' | 'meeting' | 'task';
    probability?: number; // 0-100
    // UI Helpers (Optional)
    avatar?: string;
    ownerInitials?: string;
}

export interface PipelineColumn {
    id: string;
    label: string;
    deals_count: number;
    color: string; // HEX color for stage
    // UI Helper
    deals: Deal[];
}

export interface AnalyticsReport {
    period: string; // e.g. "Q1 2024"
    total_pipeline_value: number;
    weighted_forecast: number;
    conversion_rate: number;
}
