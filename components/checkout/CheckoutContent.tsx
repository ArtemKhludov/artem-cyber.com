'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { PaymentSelector } from './PaymentSelector'
import { StripePayment } from './StripePayment'
import { CryptomusPayment } from './CryptomusPayment'
import { PurchaseStats } from '../pdf/PurchaseStats'
import { getCountryByIP, getRecommendedPaymentMethod, getCountryName } from '@/lib/geo'
import type { Document } from '@/types'

interface CheckoutContentProps {
  document: Document
}

export function CheckoutContent({ document }: CheckoutContentProps) {
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [userIP, setUserIP] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'cryptomus'>('stripe')
  const [isLoadingGeo, setIsLoadingGeo] = useState(true)

  // Определяем страну пользователя при загрузке
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const country = await getCountryByIP()
        setUserCountry(country)
        
        // Получаем IP отдельно для логирования
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipResponse.json()
        setUserIP(ipData.ip)
        
        // Устанавливаем рекомендуемый способ оплаты
        const recommended = getRecommendedPaymentMethod(country)
        setSelectedPaymentMethod(recommended)
      } catch (error) {
        console.error('Error detecting location:', error)
        // Если не удалось определить страну, оставляем Stripe по умолчанию
      } finally {
        setIsLoadingGeo(false)
      }
    }

    detectLocation()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link 
            href="/catalog" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться к каталогу
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Оформление покупки
          </h1>
          <p className="text-lg text-gray-600">
            Выберите удобный способ оплаты для получения доступа к документу
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Левая колонка - информация о документе */}
          <div className="lg:col-span-2 space-y-6">
            {/* Информация о товаре */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={document.cover_url}
                    alt={document.title}
                    className="w-24 h-32 object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {document.title}
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                    {document.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-gray-900">
                      {document.price_rub.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      PDF документ
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Селектор способа оплаты */}
            {!isLoadingGeo && (
              <PaymentSelector
                recommendedMethod={getRecommendedPaymentMethod(userCountry)}
                userCountry={userCountry}
                onMethodChange={setSelectedPaymentMethod}
              />
            )}

            {/* Загрузка геолокации */}
            {isLoadingGeo && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-gray-600">Определяем ваше местоположение...</span>
                </div>
              </div>
            )}

            {/* Компонент оплаты */}
            {!isLoadingGeo && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Оплата через {selectedPaymentMethod === 'stripe' ? 'банковскую карту' : 'Cryptomus'}
                </h3>
                
                {selectedPaymentMethod === 'stripe' ? (
                  <StripePayment
                    document={document}
                    userCountry={userCountry || undefined}
                    userIP={userIP || undefined}
                  />
                ) : (
                  <CryptomusPayment
                    document={document}
                    userCountry={userCountry || undefined}
                    userIP={userIP || undefined}
                  />
                )}
              </div>
            )}
          </div>

          {/* Правая колонка - статистика и дополнительная информация */}
          <div className="lg:col-span-1 space-y-6">
            {/* Статистика покупок */}
            <PurchaseStats documentId={document.id} createdAt={document.created_at} />

            {/* Гарантии */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Гарантии безопасности
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>256-битное SSL шифрование</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Мгновенный доступ после оплаты</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Возврат средств в течение 14 дней</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Техническая поддержка 24/7</span>
                </li>
              </ul>
            </div>

            {/* Что вы получаете */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                После оплаты вы получите:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">📄</span>
                  <span>Прямую ссылку на скачивание PDF</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">💾</span>
                  <span>Возможность сохранения на любое устройство</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">🖨️</span>
                  <span>Право печати для личного использования</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">🔄</span>
                  <span>Пожизненный доступ для повторного скачивания</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
