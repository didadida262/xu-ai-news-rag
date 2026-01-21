import api from './api'

export interface Document {
  id: number
  title: string
  content: string
  summary?: string
  source_type: 'rss' | 'web'
  source_url?: string
  source_name?: string
  tags?: string[]
  metadata?: Record<string, any>
  is_processed: boolean
  is_vectorized: boolean
  created_at: string
  updated_at: string
}

export interface DocumentListParams {
  page?: number
  per_page?: number
  source_type?: string
  search?: string
  start_date?: string
  end_date?: string
  is_processed?: boolean
  is_vectorized?: boolean
}

export interface DocumentListResponse {
  items: Document[]
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
    has_prev: boolean
    has_next: boolean
  }
}

export const documentService = {
  list: async (params: DocumentListParams = {}): Promise<DocumentListResponse> => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.per_page) queryParams.append('per_page', params.per_page.toString())
    if (params.source_type) queryParams.append('source_type', params.source_type)
    if (params.search) queryParams.append('search', params.search)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)
    if (params.is_processed !== undefined) queryParams.append('is_processed', params.is_processed.toString())
    if (params.is_vectorized !== undefined) queryParams.append('is_vectorized', params.is_vectorized.toString())
    
    const query = queryParams.toString()
    return api.get(`/documents${query ? '?' + query : ''}`)
  },

  get: async (id: number): Promise<Document> => {
    return api.get(`/documents/${id}`)
  },

  delete: async (id: number): Promise<void> => {
    return api.delete(`/documents/${id}`)
  },

  batchDelete: async (ids: number[]): Promise<{ message: string; deleted_count: number }> => {
    return api.post('/documents/batch-delete', { ids: ids.join(',') })
  },

  stats: async (): Promise<any> => {
    return api.get('/documents/stats')
  },
}
