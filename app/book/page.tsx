'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'
import { Calendar, Clock, FileText, Brain, Zap, CheckCircle, Shield, Users } from 'lucide-react'

export default function BookPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isCalLoaded, setIsCalLoaded] = useState(false)
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeProgram, setActiveProgram] = useState('mini')
  const { user } = useAuth()
  const router = useRouter()
  const sectionRef = useRef<HTMLElement>(null)

  // Обработка URL параметров для выбора программы
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const product = urlParams.get('product')
      if (product && programs.some(p => p.id === product)) {
        setActiveProgram(product)
      }
    }
  }, [])

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
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

  useEffect(() => {
    // Load Cal.com embed script
    const script = document.createElement('script')
    script.src = 'https://app.cal.com/embed/embed.js'
    script.async = true
    script.onload = () => setIsCalLoaded(true)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const handleBookingConfirm = () => {
    if (!user) {
      router.push('/auth/login?redirect=/book')
      return
    }

    const params = new URLSearchParams()
    if (selectedDate) params.set('date', selectedDate)
    if (selectedTime) params.set('time', selectedTime)
    params.set('amount', '4999')

    router.push(`/checkout?${params.toString()}`)
  }

  const calUsername = process.env.NEXT_PUBLIC_CAL_COM_USERNAME || 'energylogic'



  const programs = [
    {
      id: 'mini-session',
      title: 'Mini-сессия',
      subtitle: 'Быстрая диагностика',
      price: '₽4,999',
      originalPrice: '₽6,999',
      duration: '20 минут',
      features: [
        'Анализ речевых паттернов',
        'Базовый PDF-отчет',
        'Общие рекомендации',
        'Поддержка 7 дней'
      ],
      description: 'Экспресс-анализ личности с базовыми рекомендациями. Идеально для первого знакомства с системой.',
      popular: false,
      gradient: 'from-blue-500 to-blue-600',
      icon: '⚡'
    },
    {
      id: 'deep-day',
      title: 'Глубокий день',
      subtitle: 'Полная трансформация',
      price: '₽24,999',
      originalPrice: '₽34,999',
      duration: '6 часов',
      features: [
        'Глубокий психоанализ',
        'Детальный PDF-отчет 50+ страниц',
        'Персональная программа развития',
        'Индивидуальные упражнения',
        'Поддержка 30 дней',
        'Дополнительная сессия через месяц'
      ],
      description: 'Комплексный анализ с детальной проработкой всех аспектов личности и персональной программой развития.',
      popular: true,
      gradient: 'from-purple-500 to-pink-500',
      icon: '🔮'
    },
    {
      id: 'transformation-21',
      title: '21 день',
      subtitle: 'Новое «Я»',
      price: '₽49,999',
      originalPrice: '₽69,999',
      duration: '21 день',
      features: [
        'Ежедневные мини-сессии',
        'Персональный куратор',
        'Еженедельные отчеты',
        'Группа поддержки',
        'Финальная сессия с планом на год',
        'Пожизненная поддержка'
      ],
      description: 'Полная трансформация личности за 21 день с ежедневным сопровождением и коучингом.',
      popular: false,
      gradient: 'from-emerald-500 to-teal-500',
      icon: '🚀'
    }
  ]

  const faqItems = [
    {
      question: 'Как проходит сессия?',
      answer: 'Онлайн-встреча через защищенную платформу с записью для анализа'
    },
    {
      question: 'Можно ли перенести время?',
      answer: 'Да, можно перенести за 24 часа до начала'
    },
    {
      question: 'Когда получу результаты?',
      answer: 'PDF-отчет будет готов в течение 2-3 дней после сессии'
    },
    {
      question: 'Есть ли противопоказания?',
      answer: 'Метод безопасен, противопоказаний нет'
    }
  ]

  return (
    <div className="relative">
      {/* Главное меню */}
      <MainHeader onCallRequest={handleCallRequest} />

      {/* Основной контент */}
      <main ref={sectionRef}>
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Программы трансформации
                </span>
              </h1>
              <p className="text-lg md:text-xl mb-8 text-blue-100 leading-relaxed">
                Персональная энергетическая диагностика с ИИ-анализом
              </p>
            </div>
          </div>
        </section>

        {/* Переключатель программ */}
        <section className="py-16 bg-white border-b border-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Выберите подходящую программу
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Каждая программа разработана для разных уровней готовности к изменениям
                </p>
              </div>

              {/* Табы программ */}
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                {programs.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => setActiveProgram(program.id)}
                    className={`relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${activeProgram === program.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {program.popular && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                          Популярный
                        </div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-lg font-bold">{program.title}</div>
                      <div className="text-sm opacity-80">{program.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Контент выбранной программы */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    className={`transition-all duration-500 ${activeProgram === program.id ? 'block' : 'hidden'
                      }`}
                  >
                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                      <div>
                        <div className="flex items-center mb-4">
                          <span className="text-3xl mr-3">{program.icon}</span>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">
                              {program.title}
                            </h3>
                            <p className="text-gray-600">{program.subtitle}</p>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                          {program.description}
                        </p>

                        <div className="space-y-4">
                          {program.features.map((feature, index) => (
                            <div key={index} className="flex items-start">
                              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3 mt-1">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-gray-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="text-center mb-6">
                          <div className="flex items-baseline justify-center mb-2">
                            <span className="text-3xl font-bold text-gray-900">{program.price}</span>
                            {program.originalPrice && (
                              <span className="text-lg text-gray-500 line-through ml-2">{program.originalPrice}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-center text-gray-600 mb-4">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{program.duration}</span>
                          </div>
                          <Button
                            onClick={handleCallRequest}
                            className={`w-full bg-gradient-to-r ${program.gradient} hover:opacity-90 text-white`}
                          >
                            Записаться на программу
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Основной контент */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">

              <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Cal.com Booking Widget */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Выберите удобное время
                    </h2>

                    {isCalLoaded ? (
                      <div
                        data-cal-link={`${calUsername}/energylogic-session`}
                        data-cal-config='{"layout":"month_view","theme":"light"}'
                        className="min-h-[600px]"
                      ></div>
                    ) : (
                      <div className="flex items-center justify-center h-96">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Загрузка календаря...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Program Details */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-100">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      Что включает программа
                    </h3>
                    <div className="space-y-4">
                      {programs.find(p => p.id === activeProgram)?.features.map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3 mt-1">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Guarantee */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-start">
                      <Shield className="w-8 h-8 text-green-600 mr-3 mt-1" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-2">
                          Гарантия результата
                        </h4>
                        <p className="text-green-700 text-sm">
                          Если в течение 7 дней после начала программы вы не увидите ценности,
                          мы вернем 100% стоимости.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div className="mt-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    Частые вопросы
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Ответы на самые популярные вопросы о наших программах
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {faqItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        {item.question}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  ))}
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
              Присоединяйтесь к тысячам людей, которые уже изменили свою жизнь с помощью EnergyLogic
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCallRequest} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Заказать звонок
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/catalog">
                  Посмотреть каталог
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
