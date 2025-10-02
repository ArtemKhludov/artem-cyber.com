'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { X, Phone, User, Mail, Clock, MessageSquare, CheckCircle, ArrowRight, Home, FileText, MessageCircle, Sparkles, Eye, EyeOff } from 'lucide-react'

interface CallRequestModalProps {
  isOpen: boolean
  onClose: () => void
  sourcePage?: string
}

export function CallRequestModal({ isOpen, onClose, sourcePage }: CallRequestModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferred_time: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRedirect, setShowRedirect] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [showRegistration, setShowRegistration] = useState(false)
  const [registrationData, setRegistrationData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [userCredentials, setUserCredentials] = useState({ email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source_page: sourcePage || window.location.pathname
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка отправки заявки')
      }

      setIsSubmitted(true)

      // Проверяем, нужно ли пользователю зарегистрироваться
      if (result.data?.needs_registration) {
        // Показываем форму регистрации в модальном окне
        setRegistrationData(prev => ({
          ...prev,
          name: formData.name
        }))
        setShowRegistration(true)
      } else {
        // Показываем анимацию загрузки через 2 секунды
        setTimeout(() => {
          setShowRedirect(true)
        }, 2000)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleRegistrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegistrationData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const resetAndClose = () => {
    setFormData({ name: '', phone: '', email: '', preferred_time: '', message: '' })
    setIsSubmitted(false)
    setError(null)
    setShowRedirect(false)
    setShowRegistration(false)
    setRegistrationSuccess(false)
    setRegistrationData({ name: '', password: '', confirmPassword: '' })
    setUserCredentials({ email: '', password: '' })
    onClose()
  }

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRegistering(true)
    setError(null)

    // Валидация
    if (registrationData.password !== registrationData.confirmPassword) {
      setError('Пароли не совпадают')
      setIsRegistering(false)
      return
    }

    if (registrationData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      setIsRegistering(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registrationData.name,
          email: formData.email,
          phone: formData.phone,
          password: registrationData.password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка регистрации')
      }

      // Сохраняем данные для входа
      setUserCredentials({
        email: formData.email,
        password: registrationData.password
      })

      setRegistrationSuccess(true)

      // Автоматически входим в систему
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при регистрации')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleGoogleAuth = () => {
    // Перенаправляем на Google OAuth с правильным redirect URI
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google OAuth не настроен')
      return
    }
    
    const redirectUri = encodeURIComponent('http://localhost:3001/api/auth/oauth/google/callback')
    const scope = encodeURIComponent('openid email profile')
    const state = encodeURIComponent(JSON.stringify({ 
      source: 'modal',
      email: formData.email,
      name: formData.name,
      phone: formData.phone
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" onClick={resetAndClose}>
      <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl transform transition-all animate-in zoom-in-95 duration-300 border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 p-6 text-white relative overflow-hidden">
          {/* Звездный эффект */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Заказать звонок
                </h2>
                <p className="text-sm text-gray-300">Мы свяжемся с вами в течение 15 минут</p>
              </div>
            </div>
            <button
              onClick={resetAndClose}
              className="text-gray-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {showRegistration ? (
            <div className="text-center py-8">
              {!registrationSuccess ? (
                <>
                  {/* Registration Form */}
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse relative">
                    <User className="w-12 h-12 text-white" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full animate-ping opacity-20"></div>
                  </div>

                  <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                    Создайте аккаунт
                  </h3>

                  <p className="text-gray-600 mb-6 text-lg">
                    Для отслеживания вашей заявки создайте личный кабинет
                  </p>

                  <form onSubmit={handleRegistration} className="space-y-4 max-w-md mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Имя
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={registrationData.name}
                        onChange={handleRegistrationChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Введите ваше имя"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Пароль
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={registrationData.password}
                          onChange={handleRegistrationChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                          placeholder="Минимум 6 символов"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Подтвердите пароль
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={registrationData.confirmPassword}
                          onChange={handleRegistrationChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                          placeholder="Повторите пароль"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    <div className="space-y-3">
                      <Button
                        type="submit"
                        disabled={isRegistering}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                      >
                        {isRegistering ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Создаем аккаунт...
                          </div>
                        ) : (
                          'Создать аккаунт'
                        )}
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">или</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleGoogleAuth}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Войти через Google
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  {/* Registration Success */}
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse relative">
                    <CheckCircle className="w-12 h-12 text-white" />
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full animate-ping opacity-20"></div>
                  </div>

                  <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                    Аккаунт создан!
                  </h3>

                  <p className="text-gray-600 mb-6 text-lg">
                    Ваш личный кабинет готов. Вы будете перенаправлены через несколько секунд.
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                    <h4 className="font-medium text-green-800 mb-2">Данные для входа:</h4>
                    <p className="text-sm text-green-700">
                      <strong>Email:</strong> {userCredentials.email}<br />
                      <strong>Пароль:</strong> {userCredentials.password}
                    </p>
                  </div>

                  {/* Sparkles animation */}
                  <div className="flex justify-center space-x-2 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles
                        key={i}
                        className="w-6 h-6 text-yellow-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : isSubmitted ? (
            <div className="text-center py-8">
              {!showRedirect ? (
                <>
                  {/* Success Animation */}
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse relative">
                    <CheckCircle className="w-12 h-12 text-white" />
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full animate-ping opacity-20"></div>
                  </div>

                  <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                    Спасибо за заявку!
                  </h3>

                  <p className="text-gray-600 mb-6 text-lg">
                    Ваша заявка получена, мы с вами скоро свяжемся
                  </p>

                  {/* Sparkles animation */}
                  <div className="flex justify-center space-x-2 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles
                        key={i}
                        className="w-6 h-6 text-yellow-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Loading Animation */}
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-spin">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full"></div>
                  </div>

                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                    Перенаправляем через {countdown} сек...
                  </h3>

                  <p className="text-gray-600 mb-6">
                    Спасибо! Переходим на главную страницу
                  </p>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse"></div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link href="/catalog">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    <FileText className="w-5 h-5 mr-2" />
                    В каталог
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <Link href="/">
                  <Button variant="outline" className="w-full border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105">
                    <Home className="w-5 h-5 mr-2" />
                    На главную страницу
                  </Button>
                </Link>

                <Link href="/chat">
                  <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Чат
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6 text-center text-lg">
                Оставьте свои контакты, и наш специалист свяжется с вами для консультации
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                    Ваше имя *
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:bg-gray-50"
                      placeholder="Введите ваше имя"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                    Номер телефона *
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:bg-gray-50"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email (необязательно)
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:bg-gray-50"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="preferred_time" className="block text-sm font-semibold text-gray-700">
                    Удобное время для звонка
                  </label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      id="preferred_time"
                      name="preferred_time"
                      value={formData.preferred_time}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:bg-gray-50"
                      placeholder="Например: после 18:00 или утром"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
                    Сообщение (необязательно)
                  </label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-4 top-3 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={3}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:bg-gray-50 resize-none"
                      placeholder="Расскажите, что вас интересует..."
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAndClose}
                    className="flex-1 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
                    disabled={isSubmitting}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Заказать звонок
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <p className="text-xs text-gray-500 mt-6 text-center">
                Нажимая кнопку, вы соглашаетесь с{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                  политикой конфиденциальности
                </Link>
                {' '}и{' '}
                <Link href="/terms" className="text-blue-600 hover:underline font-medium">
                  пользовательским соглашением
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
