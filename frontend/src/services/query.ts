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
    return api.post('/query/semantic', { query, top_k })
  }
}
