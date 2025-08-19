'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Coins, Loader2, ExternalLink } from 'lucide-react'
import type { Document } from '@/types'

interface CryptomusPaymentProps {
  document: Document
  userEmail?: string
  userCountry?: string
  userIP?: string
}

export function CryptomusPayment({ document, userEmail, userCountry, userIP }: CryptomusPaymentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  const handleCryptomusPayment = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Создаем платеж через Cryptomus API
      const response = await fetch('/api/cryptomus/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          amount: document.price_rub,
          currency: 'RUB',
          userEmail,
          userCountry,
          userIP,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка при создании платежа')
      }

      const { paymentUrl: url } = await response.json()
      setPaymentUrl(url)
      
      // Автоматически открываем ссылку для оплаты
      window.open(url, '_blank')
    } catch (error) {
      console.error('Cryptomus payment error:', error)
      setError(error instanceof Error ? error.message : 'Произошла ошибка при создании платежа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {paymentUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700 text-sm mb-3">
            ✅ Ссылка для оплаты создана! Если окно не открылось автоматически, используйте кнопку ниже:
          </p>
          <Button
            asChild
            variant="outline"
            className="w-full border-green-500 text-green-700 hover:bg-green-50"
          >
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Открыть страницу оплаты
            </a>
          </Button>
        </div>
      )}

      <Button
        onClick={handleCryptomusPayment}
        disabled={isLoading || !!paymentUrl}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Создание платежа...
          </>
        ) : paymentUrl ? (
          <>
            <ExternalLink className="w-5 h-5 mr-2" />
            Ссылка создана
          </>
        ) : (
          <>
            <Coins className="w-5 h-5 mr-2" />
            Создать платеж {document.price_rub.toLocaleString('ru-RU')} ₽
          </>
        )}
      </Button>

      <div className="space-y-3">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            Доступные способы оплаты:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <div className="font-medium text-gray-700">🏦 СБП</div>
              <div className="text-gray-500">Система быстрых платежей</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-medium text-gray-700">💳 Карты РФ</div>
              <div className="text-gray-500">Visa, MasterCard, МИР</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-medium text-gray-700">₿ Bitcoin</div>
              <div className="text-gray-500">Криптовалюта</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-medium text-gray-700">💰 USDT</div>
              <div className="text-gray-500">Стейблкоин</div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Безопасная оплата через Cryptomus
          </p>
          <div className="flex items-center justify-center mt-1">
            <span className="text-xs text-gray-400">Комиссия платежной системы включена</span>
          </div>
        </div>
      </div>
    </div>
  )
}
