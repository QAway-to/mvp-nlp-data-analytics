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
    id: string;
    title: string;
    company: string;
    value: number;
    currency: string;
    status: 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
    type: 'B2B' | 'B2C';
    manager_id: string;
    created_at: Date;
    nlp_analysis?: {
        risk_score: number;
        summary_sentiment: 'positive' | 'neutral' | 'negative';
        [key: string]: any;
    };
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    cemetery_name?: string;
    permit_date?: Date;
    payment_type?: '3_parts' | '2_parts' | 'full';
    last_activity_date?: Date;
    next_activity_date?: Date;
    next_activity_type?: 'call' | 'email' | 'meeting' | 'task';
    probability?: number;
    avatar?: string;
    ownerInitials?: string;
}

export interface PipelineColumn {
    id: string;
    label: string;
    deals_count: number;
    color: string;
    deals: Deal[];
}

export interface AnalyticsReport {
    period: string;
    total_pipeline_value: number;
    weighted_forecast: number;
    conversion_rate: number;
}

// ─── Lead Generation ──────────────────────────────────────────────────────────

export type SourceType = 'telegram' | 'hh' | 'fl' | 'habr'

export interface Lead {
  id: string
  sourceChannel: string
  sourceType: SourceType
  name: string | null
  email: string | null
  phone: string | null
  username: string | null
  company: string | null
  intent: 'high' | 'medium' | 'low' | 'none'
  score: number
  status: 'new' | 'contacted' | 'qualified' | 'rejected'
  rawMessage: string
  messageUrl: string | null
  createdAt: string
}

export interface LeadSource {
  id: string
  channel: string
  type: SourceType
  lastScrapedAt: string | null
  leadCount: number
  status: 'idle' | 'scraping' | 'error'
  error?: string
}