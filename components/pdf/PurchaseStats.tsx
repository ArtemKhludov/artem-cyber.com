'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Clock } from 'lucide-react'

interface PurchaseStatsProps {
  documentId: string
  createdAt: string
}

export function PurchaseStats({ documentId, createdAt }: PurchaseStatsProps) {
  const [stats, setStats] = useState({
    totalPurchases: 0,
    todayPurchases: 0,
    viewingNow: 0
  })

  useEffect(() => {
    // Генерируем базовое количество покупок на основе ID документа
    const generateBaseCount = (id: string) => {
      let hash = 0
      for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash % 81) + 20 // Число от 20 до 100
    }

    // Вычисляем количество дней с момента создания
    const calculateDaysSinceCreation = () => {
      const created = new Date(createdAt)
      const now = new Date()
      return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Вычисляем общее количество покупок с учетом 1% роста в день
    const calculateTotalPurchases = () => {
      const baseCount = generateBaseCount(documentId)
      const days = calculateDaysSinceCreation()
      
      // Сложный процент: базовое значение * (1.01 ^ количество дней)
      const totalWithGrowth = baseCount * Math.pow(1.01, days)
      
      // Добавляем небольшую случайность для реалистичности
      const randomFactor = 0.95 + Math.random() * 0.1 // ±5%
      
      return Math.floor(totalWithGrowth * randomFactor)
    }

    // Вычисляем покупки за сегодня (0-5% от общего)
    const calculateTodayPurchases = (total: number) => {
      const percentage = Math.random() * 0.05 // 0-5%
      return Math.floor(total * percentage) + Math.floor(Math.random() * 3) // +0-2 для минимума
    }

    // Вычисляем количество смотрящих сейчас (1-15 человек)
    const calculateViewingNow = () => {
      return Math.floor(Math.random() * 15) + 1
    }

    const updateStats = () => {
      const total = calculateTotalPurchases()
      const today = calculateTodayPurchases(total)
      const viewing = calculateViewingNow()

      setStats({
        totalPurchases: total,
        todayPurchases: today,
        viewingNow: viewing
      })
    }

    // Обновляем статистику при загрузке
    updateStats()

    // Обновляем количество смотрящих каждые 10-30 секунд
    const viewingInterval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        viewingNow: calculateViewingNow()
      }))
    }, 10000 + Math.random() * 20000) // 10-30 секунд

    // Обновляем покупки за сегодня каждые 2-5 минут
    const todayInterval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        todayPurchases: calculateTodayPurchases(prev.totalPurchases)
      }))
    }, 120000 + Math.random() * 180000) // 2-5 минут

    return () => {
      clearInterval(viewingInterval)
      clearInterval(todayInterval)
    }
  }, [documentId, createdAt])

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
        Статистика покупок
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Всего покупок */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalPurchases.toLocaleString('ru-RU')}
          </div>
          <div className="text-sm text-gray-600">Всего покупок</div>
        </div>

        {/* За сегодня */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            +{stats.todayPurchases}
          </div>
          <div className="text-sm text-gray-600">За сегодня</div>
        </div>

        {/* Смотрят сейчас */}
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5 mr-1" />
            {stats.viewingNow}
          </div>
          <div className="text-sm text-gray-600">Смотрят сейчас</div>
        </div>
      </div>

      {/* Дополнительная информация - убрали "📈 +1% ежедневно" */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-center text-sm text-gray-600">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Обновлено сейчас
          </span>
        </div>
      </div>
    </div>
  )
}
