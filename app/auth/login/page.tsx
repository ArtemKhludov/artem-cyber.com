'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { useAuth } from '@/contexts/AuthContext'
import UserNotFoundModal from '@/components/auth/UserNotFoundModal'
import ResetPasswordModal from '@/components/auth/ResetPasswordModal'
import { SessionChecker } from '@/components/auth/SessionChecker'
import dynamic from 'next/dynamic'
import Script from 'next/script'

const ReCAPTCHA = dynamic(() => import('react-google-recaptcha'), { ssr: false })

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (options: {
            client_id: string
            scope: string
            redirect_uri: string
            ux_mode?: 'popup' | 'redirect'
            prompt?: 'none' | 'consent'
            callback: (response: { code?: string; error?: string; error_description?: string }) => void
          }) => { requestCode: () => void }
        }
      }
    }
  }
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUserNotFoundModal, setShowUserNotFoundModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [remember, setRemember] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaRequired, setCaptchaRequired] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { login, user } = useAuth()
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const recaptchaEnabled = Boolean(recaptchaSiteKey)
  const [captchaKey, setCaptchaKey] = useState(0)
  const googleCodeClientRef = useRef<{ requestCode: () => void } | null>(null)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  // Если пользователь уже авторизован, перенаправляем
  useEffect(() => {
    if (user) {
      // Определяем куда перенаправить в зависимости от роли
      console.log('useEffect redirect - user role:', user.role, 'redirect:', redirect)
      if (redirect && redirect !== '/') {
        console.log('Redirecting to custom redirect:', redirect)
        window.location.href = redirect
      } else if (user.role === 'admin') {
        console.log('Redirecting admin to /admin')
        window.location.href = '/admin'
      } else {
        console.log('Redirecting user to /dashboard')
        window.location.href = '/dashboard'
      }
    }
  }, [user, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setLockedUntil(null)

    if (captchaRequired && recaptchaEnabled && !captchaToken) {
      setError('Подтвердите, что вы не робот')
      setLoading(false)
      return
    }

    const result = await login(email, password, {
      remember,
      recaptchaToken: captchaToken ?? undefined
    })

    if (result.success && result.user) {
      console.log('Login successful, user role:', result.user.role)
      setCaptchaRequired(false)
      setCaptchaToken(null)
      setLockedUntil(null)
    } else {
      let errorMessage = result.error || 'Ошибка входа'

      if (result.captchaRequired) {
        if (!recaptchaEnabled) {
          setCaptchaRequired(false)
          errorMessage = 'Требуется подтверждение reCAPTCHA, но ключ не настроен'
        } else {
          setCaptchaRequired(true)
          errorMessage = result.error || 'Подтвердите, что вы не робот'
        }
      } else {
        setCaptchaRequired(false)
      }

      if (result.lockedUntil) {
        setLockedUntil(result.lockedUntil)
      } else {
        setLockedUntil(null)
      }

      if (result.error?.includes('не зарегистрирован') || result.error?.includes('не найден') || result.error?.includes('не существует')) {
        setShowUserNotFoundModal(true)
      } else {
        setError(errorMessage)
      }
    }

    setCaptchaToken(null)
    setCaptchaKey((prev) => prev + 1)
    setLoading(false)
  }

  const handleUserNotFoundRegister = () => {
    setShowUserNotFoundModal(false)
    router.push('/auth/signup')
  }

  const handleUserNotFoundResetPassword = () => {
    setShowUserNotFoundModal(false)
    setShowResetPasswordModal(true)
  }

  const handleCloseModals = () => {
    setShowUserNotFoundModal(false)
    setShowResetPasswordModal(false)
  }

  const handleGoogleCallback = useCallback(async (response: { code?: string; error?: string; error_description?: string }) => {
    if (response.error) {
      console.error('Google OAuth error:', response.error, response.error_description)
      setError('Не удалось выполнить авторизацию через Google')
      setLoading(false)
      return
    }

    if (!response.code) {
      setError('Google не вернул код авторизации')
      setLoading(false)
      return
    }

    try {
      const request = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: response.code, remember }),
        credentials: 'include'
      })

      const data = await request.json()

      if (request.ok) {
        // Перезагружаем страницу чтобы AuthContext обновился
        if (redirect && redirect !== '/') {
          window.location.href = redirect
        } else if (data.user?.role === 'admin') {
          window.location.href = '/admin'
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        setError(data.error || 'Ошибка авторизации через Google')
      }
    } catch (error) {
      console.error('Google OAuth request failed:', error)
      setError('Ошибка сети при авторизации через Google')
    } finally {
      setLoading(false)
    }
  }, [router, redirect, remember])

  const initializeGoogleClient = useCallback(() => {
    if (googleCodeClientRef.current || !window.google || !clientId) {
      return
    }

    googleCodeClientRef.current = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      redirect_uri: 'postmessage',
      ux_mode: 'popup',
      callback: handleGoogleCallback
    })
  }, [handleGoogleCallback, clientId])

  useEffect(() => {
    initializeGoogleClient()
  }, [initializeGoogleClient])

  const handleGoogleAuth = () => {
    // Используем redirect flow вместо popup для продакшна
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google OAuth не настроен')
      return
    }
    
    const redirectUri = encodeURIComponent(
      process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/api/auth/oauth/google/callback'
        : 'https://www.energylogic-ai.com/api/auth/oauth/google/callback'
    )
    const scope = encodeURIComponent('openid email profile')
    const state = encodeURIComponent(JSON.stringify({ 
      source: 'login',
      redirect: searchParams.get('redirect') || '/dashboard'
    }))
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `response_type=code&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`
    
    window.location.href = googleAuthUrl
  }

  return (
    <PageLayout>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleClient}
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Войти в аккаунт
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Или{' '}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                создайте новый аккаунт
              </Link>
            </p>
          </div>

          {/* OAuth кнопки */}
          <div className="mt-8 space-y-3">
            <Button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || !clientId}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Войти через Google</span>
            </Button>
          </div>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">или</span>
            </div>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Введите ваш email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Пароль
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Введите пароль"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Запомнить меня
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Забыли пароль?
                </a>
              </div>
            </div>

            {lockedUntil && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                Попробуйте снова после {new Date(lockedUntil).toLocaleString('ru-RU')}
              </div>
            )}

            {(captchaRequired && recaptchaEnabled) && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  key={captchaKey}
                  sitekey={recaptchaSiteKey as string}
                  onChange={(token: string | null) => setCaptchaToken(token)}
                  onExpired={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Входим...
                  </div>
                ) : (
                  'Войти'
                )}
              </Button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Нет аккаунта?{' '}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      <UserNotFoundModal
        isOpen={showUserNotFoundModal}
        onClose={handleCloseModals}
        onRegister={handleUserNotFoundRegister}
        onResetPassword={handleUserNotFoundResetPassword}
        email={email}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={handleCloseModals}
        onBack={() => {
          setShowResetPasswordModal(false)
          setShowUserNotFoundModal(true)
        }}
        email={email}
      />
    </PageLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <SessionChecker />
      <LoginForm />
    </Suspense>
  )
}
