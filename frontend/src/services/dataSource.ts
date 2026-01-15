import api from './api'

export interface DataSource {
  id: number
  name: string
  source_type: 'rss' | 'web' | 'api'
  url: string
  description?: string
  is_active: boolean
  fetch_interval: number
  last_fetch?: string
  last_success?: string
  fetch_count: number
  success_count: number
  error_count: number
  config?: Record<string, any>
}

export interface CreateDataSource {
  name: string
  source_type: 'rss' | 'web' | 'api'
  url: string
  description?: string
  fetch_interval?: number
  config?: Record<string, any>
}

export const dataSourceService = {
  list: async (): Promise<DataSource[]> => {
    return api.get('/data-sources')
  },

  get: async (id: number): Promise<DataSource> => {
    return api.get(`/data-sources/${id}`)
  },

  create: async (data: CreateDataSource): Promise<DataSource> => {
    return api.post('/data-sources', data)
  },

  update: async (id: number, data: Partial<CreateDataSource>): Promise<DataSource> => {
    return api.put(`/data-sources/${id}`, data)
  },

  delete: async (id: number): Promise<void> => {
    return api.delete(`/data-sources/${id}`)
  },

  fetch: async (id: number): Promise<{ message: string; task_id: string }> => {
    return api.post(`/data-sources/${id}/fetch`)
  },

  stats: async (): Promise<any> => {
    return api.get('/data-sources/stats')
  },
}
