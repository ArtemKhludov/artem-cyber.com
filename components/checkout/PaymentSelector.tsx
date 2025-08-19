'use client'

import { useState } from 'react'
import { CreditCard, Coins, MapPin } from 'lucide-react'

interface PaymentSelectorProps {
  recommendedMethod: 'stripe' | 'cryptomus'
  userCountry: string | null
  onMethodChange: (method: 'stripe' | 'cryptomus') => void
}

export function PaymentSelector({ 
  recommendedMethod, 
  userCountry, 
  onMethodChange 
}: PaymentSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'cryptomus'>(recommendedMethod)

  const handleMethodChange = (method: 'stripe' | 'cryptomus') => {
    setSelectedMethod(method)
    onMethodChange(method)
  }

  const getCountryName = (code: string | null) => {
    if (!code) return 'Неизвестная страна'
    
    const countryNames: Record<string, string> = {
      'RU': 'Россия',
      'BY': 'Беларусь',
      'KZ': 'Казахстан',
      'US': 'США',
      'GB': 'Великобритания',
      'DE': 'Германия',
      'FR': 'Франция',
      'UA': 'Украина'
    }
    
    return countryNames[code] || code
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center mb-4">
        <MapPin className="w-5 h-5 text-gray-600 mr-2" />
        <span className="text-sm text-gray-600">
          Ваше местоположение: <span className="font-medium">{getCountryName(userCountry)}</span>
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Выберите способ оплаты
      </h3>

      <div className="space-y-3">
        {/* Stripe Option */}
        <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
          selectedMethod === 'stripe' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          <input
            type="radio"
            name="payment-method"
            value="stripe"
            checked={selectedMethod === 'stripe'}
            onChange={() => handleMethodChange('stripe')}
            className="sr-only"
          />
          <div className="flex items-center w-full">
            <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
              selectedMethod === 'stripe' 
                ? 'border-blue-500 bg-blue-500' 
                : 'border-gray-300'
            }`}>
              {selectedMethod === 'stripe' && (
                <div className="w-2 h-2 rounded-full bg-white"></div>
              )}
            </div>
            
            <CreditCard className="w-5 h-5 text-blue-600 mr-3" />
            
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">Банковская карта</span>
                {recommendedMethod === 'stripe' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    Рекомендуется
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Visa, Mastercard, American Express
              </p>
            </div>
          </div>
        </label>

        {/* Cryptomus Option */}
        <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
          selectedMethod === 'cryptomus' 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          <input
            type="radio"
            name="payment-method"
            value="cryptomus"
            checked={selectedMethod === 'cryptomus'}
            onChange={() => handleMethodChange('cryptomus')}
            className="sr-only"
          />
          <div className="flex items-center w-full">
            <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
              selectedMethod === 'cryptomus' 
                ? 'border-purple-500 bg-purple-500' 
                : 'border-gray-300'
            }`}>
              {selectedMethod === 'cryptomus' && (
                <div className="w-2 h-2 rounded-full bg-white"></div>
              )}
            </div>
            
            <Coins className="w-5 h-5 text-purple-600 mr-3" />
            
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">Криптовалюта & СБП</span>
                {recommendedMethod === 'cryptomus' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    Рекомендуется
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Bitcoin, USDT, СБП, карты РФ
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Info about recommended method */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 Рекомендация основана на вашем местоположении для удобства оплаты
        </p>
      </div>
    </div>
  )
}
