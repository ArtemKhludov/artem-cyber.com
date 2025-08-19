'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useSupabase } from '@/components/providers/supabase-provider'
import { PageLayout } from '@/components/layout/PageLayout'

export default function BookPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isCalLoaded, setIsCalLoaded] = useState(false)
  const { user } = useSupabase()
  const router = useRouter()

  const calUsername = process.env.NEXT_PUBLIC_CAL_COM_USERNAME || 'energylogic'

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

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Записаться на диагностику
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Персональная энергетическая диагностика с ИИ-анализом. 
            Узнайте свои скрытые ресурсы и получите план трансформации.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Cal.com Booking Widget */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 border">
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

          {/* Session Details */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Что включает диагностика
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Персональная сессия 90 минут</h4>
                    <p className="text-gray-600 text-sm">Глубокий анализ энергетического состояния</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">ИИ-обработка данных</h4>
                    <p className="text-gray-600 text-sm">Анализ через нейросеть EnergyLogic</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">PDF-отчет 20+ страниц</h4>
                    <p className="text-gray-600 text-sm">Детальный план трансформации</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">21-дневный план</h4>
                    <p className="text-gray-600 text-sm">Пошаговые практики для изменений</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">₽4,999</div>
                <div className="text-gray-600">Полная диагностика</div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Персональная сессия</span>
                  <span>₽3,500</span>
                </div>
                <div className="flex justify-between">
                  <span>ИИ-анализ</span>
                  <span>₽999</span>
                </div>
                <div className="flex justify-between">
                  <span>PDF-отчет</span>
                  <span>₽500</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold text-gray-900">
                  <span>Итого</span>
                  <span>₽4,999</span>
                </div>
              </div>
            </div>

            {/* Guarantee */}
            <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">
                Гарантия результата
              </h4>
              <p className="text-green-700 text-sm">
                Если в течение 7 дней после сессии вы не увидите ценности в отчете, 
                мы вернем 100% стоимости.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Частые вопросы
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Как проходит сессия?
              </h4>
              <p className="text-sm text-gray-600">
                Онлайн-встреча через защищенную платформу с записью для анализа
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Можно ли перенести время?
              </h4>
              <p className="text-sm text-gray-600">
                Да, можно перенести за 24 часа до начала
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Когда получу результаты?
              </h4>
              <p className="text-sm text-gray-600">
                PDF-отчет будет готов в течение 2-3 дней после сессии
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Есть ли противопоказания?
              </h4>
              <p className="text-sm text-gray-600">
                Метод безопасен, противопоказаний нет
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
