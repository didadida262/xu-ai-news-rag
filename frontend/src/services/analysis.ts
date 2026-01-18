import api from './api'

export interface Keyword {
  word: string
  count: number
  frequency: number
}

export interface SourceDistribution {
  source_type: string
  count: number
  percentage: number
}

export interface TimeTrend {
  date: string
  count: number
}

export interface AnalysisOverview {
  keywords: Keyword[]
  source_distribution: SourceDistribution[]
  time_trend: TimeTrend[]
  total_documents: number
  date_range: {
    start_date?: string
    end_date?: string
  }
}

export interface AnalysisParams {
  start_date?: string
  end_date?: string
  source_type?: 'rss' | 'web' | 'api' | 'upload'
  top_k?: number
  group_by?: 'day' | 'week' | 'month'
}

export const analysisService = {
  getKeywords: async (params?: AnalysisParams): Promise<Keyword[]> => {
    return api.get('/analysis/keywords', { params })
  },

  getSourceDistribution: async (params?: AnalysisParams): Promise<SourceDistribution[]> => {
    return api.get('/analysis/source-distribution', { params })
  },

  getTimeTrend: async (params?: AnalysisParams): Promise<TimeTrend[]> => {
    return api.get('/analysis/time-trend', { params })
  },

  getOverview: async (params?: AnalysisParams): Promise<AnalysisOverview> => {
    return api.get('/analysis/overview', { params })
  },
}
