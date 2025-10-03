'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef
} from 'react'

interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  last_activity?: string
}

interface LoginOptions {
  remember?: boolean
  recaptchaToken?: string
}

interface LoginResult {
  success: boolean
  error?: string
  user?: User
  captchaRequired?: boolean
  lockedUntil?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, options?: LoginOptions) => Promise<LoginResult>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACTIVITY_PING_INTERVAL = 5 * 60 * 1000
const IDLE_TIMEOUT = 30 * 60 * 1000
const SESSION_COOKIE = 'session_token'

function clearSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=; Max-Age=0; path=/;`
}

function getCurrentPath() {
  if (typeof window === 'undefined') return '/'
  const { pathname, search } = window.location
  return `${pathname}${search}`
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  
  const publicPages = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund']
  const isPublicPage = publicPages.includes(window.location.pathname)
  
  // Не перенаправляем с публичных страниц
  if (isPublicPage) {
    return
  }
  
  const currentPath = getCurrentPath()
  const loginUrl = `/auth/login?redirect=${encodeURIComponent(currentPath)}`

  if (!window.location.pathname.startsWith('/auth')) {
    window.location.href = loginUrl
  }
}

async function sendSessionPing(useBeacon: boolean) {
  const payload = JSON.stringify({ timestamp: Date.now() })

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const data = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/auth/me', data)
    return
  }

  try {
    await fetch('/api/auth/me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      credentials: 'include',
      keepalive: true,
      cache: 'no-store'
    })
  } catch (error) {
    console.error('Activity ping failed:', error)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const lastActivityRef = useRef<number>(Date.now())
  const lastPingRef = useRef<number>(0)
  const pingInFlightRef = useRef(false)
  const checkInFlightRef = useRef(false)

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const pingSession = useCallback(
    async (useBeacon = false) => {
      if (pingInFlightRef.current && !useBeacon) {
        return
      }

      pingInFlightRef.current = !useBeacon
      try {
        lastPingRef.current = Date.now()
        await sendSessionPing(useBeacon)
      } finally {
        pingInFlightRef.current = false
      }
    },
    []
  )

  const checkSession = useCallback(async (redirectOnFail = true) => {
    if (checkInFlightRef.current) {
      return
    }

    checkInFlightRef.current = true
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        return
      }

      setUser(null)

      if (response.status === 401) {
        clearSessionCookie()
        // Не перенаправляем на логин при обновлении страницы
        // Middleware уже обрабатывает это
        if (redirectOnFail && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          // Перенаправляем только если это не публичная страница
          const publicPages = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund']
          const isPublicPage = publicPages.includes(window.location.pathname)
          if (!isPublicPage) {
            redirectToLogin()
          }
        }
      }
    } catch (error) {
      console.error('Session check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
      checkInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    // Проверяем сессию только один раз при монтировании
    checkSession(false) // false = не перенаправлять на логин
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) {
      return
    }

    recordActivity()
    lastPingRef.current = Date.now()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void pingSession(true)
      }
    }

    const handleBeforeUnload = () => {
      void pingSession(true)
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivityRef.current
      const timeSincePing = now - lastPingRef.current

      // Проверяем, что пользователь все еще авторизован
      if (user && timeSinceActivity < IDLE_TIMEOUT && timeSincePing >= ACTIVITY_PING_INTERVAL) {
        void pingSession()
      }
    }, 60 * 1000)

    const events: Array<keyof DocumentEventMap> = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    events.forEach(event => {
      document.addEventListener(event, recordActivity, true)
    })

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      events.forEach(event => {
        document.removeEventListener(event, recordActivity, true)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user, recordActivity, pingSession])

  const login = useCallback(async (email: string, password: string, options: LoginOptions = {}) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          remember: options.remember ?? false,
          recaptchaToken: options.recaptchaToken
        }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        void checkSession(false)
        return { success: true, user: data.user as User }
      }

      return {
        success: false,
        error: data.error || 'Ошибка входа',
        captchaRequired: Boolean(data.captchaRequired),
        lockedUntil: data.lockedUntil
      }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: 'Ошибка сети' }
    }
  }, [checkSession])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      clearSessionCookie()
      setUser(null)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        redirectToLogin()
      }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    await checkSession()
  }, [checkSession])

  const register = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name, phone }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, user: data.user }
      }

      return { success: false, error: data.error || 'Ошибка регистрации' }
    } catch (error) {
      console.error('Register failed:', error)
      return { success: false, error: 'Ошибка сети' }
    }
  }, [])

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
