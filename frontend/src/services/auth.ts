import api from './api'

export interface LoginData {
  username: string
  password: string
}

export interface User {
  id: number
  username: string
  email?: string
  role: string
  is_active: boolean
}

export interface LoginResponse {
  token: string
  user: User
}

export const authService = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    return api.post('/auth/login', data)
  },

  register: async (data: LoginData & { email?: string }): Promise<User> => {
    return api.post('/auth/register', data)
  },

  getProfile: async (): Promise<User> => {
    return api.get('/auth/profile')
  },

  logout: () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  },
}
