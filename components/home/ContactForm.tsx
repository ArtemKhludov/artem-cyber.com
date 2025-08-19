'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Phone, Mail, MapPin, Clock, CheckCircle } from 'lucide-react'

export function ContactForm() {
  const [isVisible, setIsVisible] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const sectionRef = useRef<HTMLElement>(null)

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Введите номер телефона'
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Введите корректный номер телефона'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Введите корректный email'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Введите ваше сообщение'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Здесь будет логика отправки формы
      await new Promise(resolve => setTimeout(resolve, 2000)) // Имитация отправки
      
      setIsSubmitted(true)
      setFormData({ name: '', phone: '', email: '', message: '' })
      
      // Сброс формы через 5 секунд
      setTimeout(() => {
        setIsSubmitted(false)
      }, 5000)
      
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const contactInfo = [
    {
      icon: Phone,
      title: 'Телефон',
      value: '+7 (999) 123-45-67',
      subtitle: 'Ежедневно с 9:00 до 21:00'
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'support@energylogic.com',
      subtitle: 'Ответим в течение часа'
    },
    {
      icon: MapPin,
      title: 'Адрес',
      value: 'Москва, ул. Примерная, 123',
      subtitle: 'Офис для личных встреч'
    },
    {
      icon: Clock,
      title: 'Время работы',
      value: '9:00 - 21:00',
      subtitle: 'Пн-Вс, без выходных'
    }
  ]

  return (
    <section id="contacts" ref={sectionRef} className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
      {/* Декоративный фон */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='0.5' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
          }}></div>
        </div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Заголовок секции */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">
            Свяжитесь с нами
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            Готовы изменить свою 
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {" "}жизнь?
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Остались вопросы? Хотите узнать больше о наших программах? 
            Напишите нам, и мы поможем выбрать идеальный путь трансформации.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Левая часть - контактная информация */}
          <div className={`transform transition-all duration-1000 ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
          }`}>
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">Как с нами связаться</h3>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => {
                    const IconComponent = info.icon
                    return (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-600 rounded-xl">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">{info.title}</h4>
                          <p className="text-blue-200 font-medium">{info.value}</p>
                          <p className="text-gray-400 text-sm">{info.subtitle}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Дополнительная информация */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h4 className="font-semibold text-white mb-4">Быстрый старт</h4>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Бесплатная консультация за 15 минут
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Подбор оптимальной программы
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    Ответы на все ваши вопросы
                  </div>
                </div>
              </div>

              {/* Социальные сети */}
              <div>
                <h4 className="font-semibold text-white mb-4">Мы в социальных сетях</h4>
                <div className="flex space-x-4">
                  {[
                    { name: 'Telegram', href: '#', color: 'bg-blue-500' },
                    { name: 'VK', href: '#', color: 'bg-blue-600' },
                    { name: 'YouTube', href: '#', color: 'bg-red-600' },
                    { name: 'Instagram', href: '#', color: 'bg-purple-600' }
                  ].map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      className={`w-10 h-10 ${social.color} rounded-lg flex items-center justify-center text-white hover:scale-110 transform transition-all duration-200`}
                    >
                      {social.name[0]}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Правая часть - форма */}
          <div className={`transform transition-all duration-1000 delay-300 ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
          }`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              {!isSubmitted ? (
                <>
                  <h3 className="text-2xl font-bold text-white mb-6">Отправить сообщение</h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Ваше имя *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                            errors.name ? 'border-red-500' : 'border-white/20'
                          }`}
                          placeholder="Введите ваше имя"
                        />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Телефон *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                            errors.phone ? 'border-red-500' : 'border-white/20'
                          }`}
                          placeholder="+7 (999) 123-45-67"
                        />
                        {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email (необязательно)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.email ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="your@email.com"
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Сообщение *
                      </label>
                      <textarea
                        rows={4}
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none ${
                          errors.message ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="Расскажите, чем мы можем помочь..."
                      />
                      {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message}</p>}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Отправляем...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Send className="mr-2 w-5 h-5" />
                          Отправить сообщение
                        </div>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Спасибо за обращение!
                  </h3>
                  <p className="text-gray-300 text-lg">
                    Мы получили ваше сообщение и свяжемся с вами в течение часа.
                  </p>
                  <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm text-gray-400">
                      Следующий шаг: наш специалист проанализирует ваш запрос и предложит 
                      оптимальное решение именно для вашей ситуации.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
