'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { useAuth } from '@/contexts/AuthContext'
import ExistingAccountModal from '@/components/auth/ExistingAccountModal'
import ResetPasswordModal from '@/components/auth/ResetPasswordModal'

function SignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExistingAccountModal, setShowExistingAccountModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [existingUserData, setExistingUserData] = useState({ email: '', name: '' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { register, user } = useAuth()

  // Если пользователь уже авторизован, перенаправляем
  useEffect(() => {
    if (user) {
      router.push(redirect)
    }
  }, [user, router, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Валидация
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      setLoading(false)
      return
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Неверный формат email')
      setLoading(false)
      return
    }

    const result = await register(
      formData.email,
      formData.password,
      formData.name
    )

    if (result.success) {
      // После успешной регистрации отправляем email для верификации
      try {
        await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        })
      } catch (error) {
        console.error('Error sending verification email:', error)
      }

      router.push('/auth/login')
    } else {
      // Проверяем, является ли ошибка связанной с существующим аккаунтом
      if (result.error?.includes('уже существует') || result.error?.includes('duplicate')) {
        // Показываем модальное окно с существующим аккаунтом
        setExistingUserData({
          email: formData.email,
          name: formData.name
        })
        setShowExistingAccountModal(true)
      } else {
        setError(result.error || 'Ошибка регистрации')
      }
    }

    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError('')

    try {
      // Имитируем Google OAuth для тестирования
      // В реальном приложении здесь будет интеграция с Google OAuth SDK
      const response = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: 'test_google_token',
          email: 'test-google-ui@example.com',
          name: 'Google User',
          picture: 'https://example.com/google-avatar.jpg'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Успешная авторизация через Google - перенаправляем в личный кабинет
        router.push('/dashboard')
      } else {
        setError(data.error || 'Ошибка авторизации через Google')
      }
    } catch (error) {
      setError('Ошибка авторизации через Google')
    } finally {
      setLoading(false)
    }
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleExistingAccountLogin = () => {
    setShowExistingAccountModal(false)
    router.push('/auth/login')
  }

  const handleResetPassword = () => {
    setShowExistingAccountModal(false)
    setShowResetPasswordModal(true)
  }

  const handleCloseModals = () => {
    setShowExistingAccountModal(false)
    setShowResetPasswordModal(false)
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Создать аккаунт
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Или{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                войдите в существующий аккаунт
              </Link>
            </p>
          </div>

          {/* OAuth кнопки */}
          <div className="mt-8 space-y-3">
            <Button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Продолжить с Google</span>
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
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Имя
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Введите ваше имя"
                  />
                </div>
              </div>

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
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Введите ваш email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Телефон (необязательно)
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+7 (999) 123-45-67"
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
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
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

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Подтвердите пароль
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Подтвердите пароль"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Создаем аккаунт...
                  </div>
                ) : (
                  'Создать аккаунт'
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Нажимая кнопку, вы соглашаетесь с{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                политикой конфиденциальности
              </Link>
              {' '}и{' '}
              <Link href="/terms" className="text-blue-600 hover:underline font-medium">
                пользовательским соглашением
              </Link>
            </p>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Уже есть аккаунт?{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      <ExistingAccountModal
        isOpen={showExistingAccountModal}
        onClose={handleCloseModals}
        onLogin={handleExistingAccountLogin}
        onResetPassword={handleResetPassword}
        email={existingUserData.email}
        name={existingUserData.name}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={handleCloseModals}
        onBack={() => {
          setShowResetPasswordModal(false)
          setShowExistingAccountModal(true)
        }}
        email={existingUserData.email}
      />
    </PageLayout>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <SignupForm />
    </Suspense>
  )
}