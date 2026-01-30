import api from './api'

export interface SemanticQueryResult {
  id: number
  title: string
  summary: string
  score: number
  source_type: string
  source_name?: string
  created_at?: string
}

export const queryService = {
  semantic: async (query: string, top_k: number = 5): Promise<SemanticQueryResult[]> => {
    // 语义查询可能需要更长时间（首次加载模型），使用更长的超时时间
    return api.post('/query/semantic', { query, top_k }, { timeout: 120000 })
  }
}
