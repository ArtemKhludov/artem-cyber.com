'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  last_activity?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setUser(null)
        // Если сессия истекла, очищаем cookie
        if (response.status === 401) {
          document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          // Перенаправляем на страницу входа если мы на защищенной странице
          if (typeof window !== 'undefined' &&
            (window.location.pathname.startsWith('/dashboard') ||
              window.location.pathname.startsWith('/admin'))) {
            window.location.href = '/auth/login'
          }
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      setUser(null)
      // При ошибке сети тоже очищаем cookie
      document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    } finally {
      setLoading(false)
    }
  }, [])

  // Отслеживание активности пользователя
  useEffect(() => {
    if (!user) return

    let activityTimer: NodeJS.Timeout

    const resetActivityTimer = () => {
      clearTimeout(activityTimer)
      activityTimer = setTimeout(() => {
        // Проверяем сессию каждые 5 минут
        checkSession()
      }, 5 * 60 * 1000) // 5 минут
    }

    // Слушаем события активности
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    events.forEach(event => {
      document.addEventListener(event, resetActivityTimer, true)
    })

    // Начальный таймер
    resetActivityTimer()

    return () => {
      clearTimeout(activityTimer)
      events.forEach(event => {
        document.removeEventListener(event, resetActivityTimer, true)
      })
    }
  }, [user, checkSession])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Принудительно обновляем состояние пользователя
        setUser(data.user)

        // Дополнительно проверяем сессию для уверенности
        setTimeout(async () => {
          try {
            const sessionResponse = await fetch('/api/auth/me')
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json()
              setUser(sessionData)
            }
          } catch (error) {
            console.error('Session check failed:', error)
          }
        }, 100)

        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error || 'Ошибка входа' }
      }
    } catch (error) {
      return { success: false, error: 'Ошибка сети' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const refreshSession = async () => {
    await checkSession()
  }

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, phone }),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error || 'Ошибка регистрации' }
      }
    } catch (error) {
      return { success: false, error: 'Ошибка сети' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}