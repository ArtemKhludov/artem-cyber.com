'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getStripe } from '@/lib/stripe'
import { PageLayout } from '@/components/layout/PageLayout'

function CheckoutContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Get booking details from URL params
  const sessionDate = searchParams.get('date')
  const sessionTime = searchParams.get('time')
  const amount = parseInt(searchParams.get('amount') || '4999')

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/checkout')
    }
  }, [user, router])

  const handlePayment = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          sessionDate,
          sessionTime,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret } = await response.json()

      // Redirect to Stripe checkout
      const stripe = await getStripe()
      if (!stripe) throw new Error('Stripe not loaded')

      const { error } = await stripe.confirmCardPayment(clientSecret)

      if (error) {
        setError(error.message || 'Payment failed')
      } else {
        // Payment successful, redirect to success page
        router.push('/checkout/success')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-20 max-w-2xl">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <h1 className="text-2xl font-bold">Оплата диагностики</h1>
          <p className="opacity-90">Завершите бронирование</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Детали заказа</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Энергетическая диагностика</span>
                <span>₽{amount.toLocaleString()}</span>
              </div>
              {sessionDate && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Дата сессии</span>
                  <span>{new Date(sessionDate).toLocaleDateString('ru-RU')}</span>
                </div>
              )}
              {sessionTime && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Время</span>
                  <span>{sessionTime}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Итого</span>
                <span>₽{amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Что включено</h3>
            <ul className="space-y-2 text-sm">
              {[
                'Персональная 60-минутная аудио-сессия',
                'Детальный PDF-отчет с анализом',
                'Индивидуальные рекомендации',
                'Поддержка специалиста в течение 7 дней',
                'Доступ к записи сессии (30 дней)'
              ].map((item, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* User Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Контактная информация</h3>
            <div className="text-sm space-y-1">
              <div><strong>Email:</strong> {user.email}</div>
              <div className="text-gray-600">
                Все уведомления и материалы будут отправлены на этот адрес
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Payment Button */}
          <div className="space-y-4">
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Обработка...</span>
                </div>
              ) : (
                `Оплатить ₽${amount.toLocaleString()}`
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <div>Безопасная оплата через Stripe</div>
              <div>Данные карты защищены SSL-шифрованием</div>
            </div>
          </div>

          {/* Guarantee */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-green-800">Гарантия качества</h4>
                <p className="text-sm text-green-700 mt-1">
                  Если вы не удовлетворены результатом, мы вернем 100% стоимости в течение 14 дней
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <PageLayout>
      <Suspense fallback={
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-pulse">Загрузка...</div>
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </PageLayout>
  )
}
