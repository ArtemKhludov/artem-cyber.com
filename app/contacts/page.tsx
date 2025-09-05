'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, MessageCircle, Send, Clock, Users, Globe, User, ChevronDown, MessageSquare, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

export default function ContactsPage() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'Здравствуйте! Чем могу помочь?', isUser: false, time: '14:30' }
  ])
  const sectionRef = useRef<HTMLElement>(null)

  // Состояния для формы обратного звонка
  const [callbackFormData, setCallbackFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferred_time: '',
    message: '',
    agreed: false
  })
  const [isCallbackSubmitting, setIsCallbackSubmitting] = useState(false)
  const [isCallbackSubmitted, setIsCallbackSubmitted] = useState(false)
  const [callbackSubmitError, setCallbackSubmitError] = useState<string | null>(null)

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
  }

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!callbackFormData.agreed) {
      setCallbackSubmitError('Необходимо согласиться с условиями')
      return
    }

    setIsCallbackSubmitting(true)
    setCallbackSubmitError(null)

    try {
      const response = await fetch('/api/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: callbackFormData.name,
          phone: callbackFormData.phone,
          email: callbackFormData.email,
          message: callbackFormData.message,
          preferred_time: callbackFormData.preferred_time,
          source_page: '/contacts',
          product_type: 'callback_request',
          product_name: 'Заказ обратного звонка',
          notes: `Время для звонка: ${callbackFormData.preferred_time || 'В любое время'}. Сообщение: ${callbackFormData.message || 'Нет'}`
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка отправки заявки')
      }

      setIsCallbackSubmitted(true)
      setCallbackFormData({ name: '', phone: '', email: '', preferred_time: '', message: '', agreed: false })

      // Сброс формы через 5 секунд
      setTimeout(() => {
        setIsCallbackSubmitted(false)
      }, 5000)

    } catch (error) {
      console.error('Error submitting callback form:', error)
      setCallbackSubmitError(error instanceof Error ? error.message : 'Произошла ошибка при отправке')
    } finally {
      setIsCallbackSubmitting(false)
    }
  }

  const handleSendMessage = async () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        text: chatMessage,
        isUser: true,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages([...chatMessages, newMessage])
      const userMessage = chatMessage
      setChatMessage('')

      try {
        // Отправляем сообщение в CRM-систему
        const response = await fetch('/api/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Пользователь чата',
            phone: 'Не указан',
            email: 'Не указан',
            message: userMessage,
            preferred_time: '',
            source_page: '/contacts',
            product_type: 'chat_message',
            product_name: 'Сообщение из чата',
            notes: `Сообщение из чата: ${userMessage}`
          })
        })

        if (response.ok) {
          // Успешная отправка - показываем подтверждение
          setTimeout(() => {
            const managerResponse = {
              id: chatMessages.length + 2,
              text: '✅ Сообщение получено! Менеджер свяжется с вами в ближайшее время.',
              isUser: false,
              time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            }
            setChatMessages(prev => [...prev, managerResponse])
          }, 1000)
        } else {
          throw new Error('Ошибка отправки')
        }
      } catch (error) {
        // Ошибка отправки - показываем сообщение об ошибке
        setTimeout(() => {
          const errorResponse = {
            id: chatMessages.length + 2,
            text: '❌ Произошла ошибка при отправке. Попробуйте еще раз или используйте форму "Заказать звонок".',
            isUser: false,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          }
          setChatMessages(prev => [...prev, errorResponse])
        }, 1000)
      }
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const contactInfo = [
    {
      icon: Phone,
      title: 'Телефон',
      value: '+7 (999) 123-45-67',
      href: 'tel:+79991234567',
      description: 'Звоните в любое время'
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'support@energylogic.com',
      href: 'mailto:support@energylogic.com',
      description: 'Пишите нам на почту'
    },
    {
      icon: MapPin,
      title: 'Адрес',
      value: 'Москва, ул. Примерная, 123',
      href: '#',
      description: 'Наш офис в центре города'
    },
    {
      icon: Clock,
      title: 'Режим работы',
      value: '24/7',
      href: '#',
      description: 'Работаем круглосуточно'
    }
  ]

  const socialLinks = [
    { name: 'Telegram', href: 'https://t.me/energylogic', icon: '🔵', color: 'hover:bg-blue-500' },
    { name: 'VK', href: 'https://vk.com/energylogic', icon: '📘', color: 'hover:bg-blue-600' },
    { name: 'YouTube', href: 'https://youtube.com/@energylogic', icon: '🔴', color: 'hover:bg-red-600' },
    { name: 'Instagram', href: 'https://instagram.com/energylogic', icon: '🟣', color: 'hover:bg-purple-600' }
  ]

  return (
    <div className="relative">
      {/* Главное меню */}
      <MainHeader onCallRequest={handleCallRequest} />

      {/* Основной контент */}
      <main ref={sectionRef}>
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Контакты
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-12 text-blue-100 leading-relaxed">
                Свяжитесь с нами любым удобным способом<br />
                Мы всегда готовы помочь и ответить на ваши вопросы
              </p>
            </div>
          </div>
        </section>

        {/* Контактная информация */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Контактные данные */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {contactInfo.map((contact, index) => (
                  <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <contact.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{contact.title}</h3>
                    <a
                      href={contact.href}
                      className="text-blue-600 hover:text-blue-700 font-medium block mb-1"
                    >
                      {contact.value}
                    </a>
                    <p className="text-gray-600 text-sm">{contact.description}</p>
                  </div>
                ))}
              </div>

              {/* Основной контент */}
              <div className="grid lg:grid-cols-2 gap-12">
                {/* Форма обратного звонка */}
                <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 p-8 rounded-2xl shadow-lg border border-blue-100 relative overflow-hidden">
                  {/* Декоративные элементы */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Заказать обратный звонок
                        </h2>
                        <p className="text-sm text-gray-500">Мы перезвоним вам в удобное время</p>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-6 text-lg">
                      📞 Оставьте свои контакты, и мы перезвоним вам в удобное время
                    </p>

                    {!isCallbackSubmitted ? (
                      <>
                        {callbackSubmitError && (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                            <p className="text-red-600 text-sm">{callbackSubmitError}</p>
                          </div>
                        )}

                        <form onSubmit={handleCallbackSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Ваше имя *</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={callbackFormData.name}
                                onChange={(e) => setCallbackFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-3 pl-12 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                placeholder="Введите ваше имя"
                                required
                              />
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <User className="w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">📱 Телефон *</label>
                            <div className="relative">
                              <input
                                type="tel"
                                value={callbackFormData.phone}
                                onChange={(e) => setCallbackFormData(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-4 py-3 pl-12 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                placeholder="+7 (999) 123-45-67"
                                required
                              />
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <Phone className="w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">📧 Email (необязательно)</label>
                            <div className="relative">
                              <input
                                type="email"
                                value={callbackFormData.email}
                                onChange={(e) => setCallbackFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-4 py-3 pl-12 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                                placeholder="your@email.com"
                              />
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <Mail className="w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">⏰ Удобное время для звонка</label>
                            <div className="relative">
                              <select
                                value={callbackFormData.preferred_time}
                                onChange={(e) => setCallbackFormData(prev => ({ ...prev, preferred_time: e.target.value }))}
                                className="w-full px-4 py-3 pl-12 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300 appearance-none"
                              >
                                <option value="">В любое время</option>
                                <option value="9:00 - 12:00">9:00 - 12:00</option>
                                <option value="12:00 - 15:00">12:00 - 15:00</option>
                                <option value="15:00 - 18:00">15:00 - 18:00</option>
                                <option value="18:00 - 21:00">18:00 - 21:00</option>
                              </select>
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <Clock className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">💬 Комментарий</label>
                            <div className="relative">
                              <textarea
                                rows={3}
                                value={callbackFormData.message}
                                onChange={(e) => setCallbackFormData(prev => ({ ...prev, message: e.target.value }))}
                                className="w-full px-4 py-3 pl-12 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300 resize-none"
                                placeholder="О чем хотите поговорить?"
                              />
                              <div className="absolute left-4 top-4">
                                <MessageSquare className="w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          </div>

                          {/* Согласие с правовыми документами */}
                          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                id="callback-disclaimer"
                                checked={callbackFormData.agreed}
                                onChange={(e) => setCallbackFormData(prev => ({ ...prev, agreed: e.target.checked }))}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                required
                              />
                              <label htmlFor="callback-disclaimer" className="text-sm text-gray-700 leading-relaxed">
                                <span className="font-medium text-yellow-800">⚠️ Важно:</span>{' '}
                                Нажимая кнопку, вы соглашаетесь с{' '}
                                <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                                  политикой конфиденциальности
                                </Link>
                                {', '}
                                <Link href="/terms" className="text-blue-600 hover:underline font-medium">
                                  пользовательским соглашением
                                </Link>
                                {' '}и{' '}
                                <Link href="/disclaimer" className="text-blue-600 hover:underline font-medium">
                                  отказом от ответственности
                                </Link>
                              </label>
                            </div>
                          </div>

                          <Button
                            type="submit"
                            disabled={isCallbackSubmitting}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50"
                          >
                            {isCallbackSubmitting ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Отправляем...
                              </div>
                            ) : (
                              <>
                                <Phone className="mr-2 w-5 h-5" />
                                Заказать звонок
                              </>
                            )}
                          </Button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                          Спасибо за заявку!
                        </h3>
                        <p className="text-gray-600 text-lg">
                          Мы получили вашу заявку и перезвоним вам в указанное время.
                        </p>
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-sm text-blue-700">
                            Следующий шаг: наш специалист свяжется с вами для уточнения деталей
                            и ответит на все ваши вопросы.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Онлайн чат */}
                <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 p-8 rounded-2xl shadow-lg border border-blue-100 relative overflow-hidden">
                  {/* Декоративные элементы */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Онлайн чат
                          </h2>
                          <p className="text-sm text-gray-500">Прямая связь с нашими специалистами</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-700 font-medium">Онлайн</span>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-6 text-lg">
                      💬 Напишите нам прямо сейчас. Менеджер ответит в течение 2-3 минут
                    </p>

                    {/* Чат окно */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 h-64 mb-6 overflow-y-auto border border-white/50 shadow-inner">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`mb-4 ${message.isUser ? 'text-right' : 'text-left'}`}
                        >
                          <div
                            className={`inline-block max-w-xs px-4 py-3 rounded-2xl text-sm shadow-sm ${message.isUser
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-200 shadow-md'
                              }`}
                          >
                            <p className="leading-relaxed">{message.text}</p>
                            <p className={`text-xs mt-2 ${message.isUser ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                              {message.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Согласие с отказом от ответственности */}
                    <div className="mb-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="chat-disclaimer"
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="chat-disclaimer" className="text-sm text-gray-700 leading-relaxed">
                          <span className="font-medium text-yellow-800">⚠️ Важно:</span>{' '}
                          Я подтверждаю, что понимаю, что результаты не являются диагнозом, и принимаю ответственность за использование материалов.{' '}
                          <Link href="/disclaimer" className="text-blue-600 hover:underline font-medium">
                            Отказ от ответственности
                          </Link>
                        </label>
                      </div>
                    </div>

                    {/* Поле ввода */}
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="w-full px-4 py-3 pr-12 bg-white/90 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-300"
                          placeholder="💬 Введите ваше сообщение..."
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Социальные сети */}
              <div className="mt-16 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Мы в социальных сетях</h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Следите за нашими новостями, участвуйте в обсуждениях и получайте полезные материалы
                </p>
                <div className="flex justify-center space-x-4">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 ${social.color}`}
                      title={social.name}
                    >
                      <span className="text-2xl">{social.icon}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Карта */}
              <div className="mt-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Как нас найти</h2>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Интерактивная карта</p>
                      <p className="text-sm text-gray-500">Москва, ул. Примерная, 123</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Готовы начать свое путешествие к самопознанию?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Свяжитесь с нами прямо сейчас и получите персональную консультацию
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCallRequest} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Phone className="mr-2 w-4 h-4" />
                Заказать звонок
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/book">
                  <MessageCircle className="mr-2 w-4 h-4" />
                  Записаться на сессию
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Call request modal */}
      <CallRequestModal
        isOpen={isCallModalOpen}
        onClose={handleCloseCallModal}
      />
    </div>
  )
}
