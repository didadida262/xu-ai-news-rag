import { useState, useEffect } from 'react'
import { authService, User } from '../services/auth'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authService.getProfile()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const response = await authService.login({ username, password })
    if (response && response.token) {
      localStorage.setItem('token', response.token)
      setUser(response.user)
      return response
    }
    throw new Error('登录失败：未收到token')
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  return { user, loading, login, logout, isAuthenticated: !!user }
}
