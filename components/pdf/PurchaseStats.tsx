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
    // Generate base purchase count from document ID
    const generateBaseCount = (id: string) => {
      let hash = 0
      for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash % 81) + 20 // Number from 20 to 100
    }

    // Calculate days since creation
    const calculateDaysSinceCreation = () => {
      const created = new Date(createdAt)
      const now = new Date()
      return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate total purchases with 1% daily growth
    const calculateTotalPurchases = () => {
      const baseCount = generateBaseCount(documentId)
      const days = calculateDaysSinceCreation()
      
      // Compound growth: base * (1.01 ^ days)
      const totalWithGrowth = baseCount * Math.pow(1.01, days)
      
      // Add slight randomness for realism
      const randomFactor = 0.95 + Math.random() * 0.1 // ±5%
      
      return Math.floor(totalWithGrowth * randomFactor)
    }

    // Calculate today's purchases (0-5% of total)
    const calculateTodayPurchases = (total: number) => {
      const percentage = Math.random() * 0.05 // 0-5%
      return Math.floor(total * percentage) + Math.floor(Math.random() * 3) // +0-2 min
    }

    // Calculate viewers now (1-15 people)
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

    // Update stats on load
    updateStats()

    // Update viewers every 10-30s
    const viewingInterval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        viewingNow: calculateViewingNow()
      }))
    }, 10000 + Math.random() * 20000) // 10-30 seconds

    // Update today's purchases every 2-5 minutes
    const todayInterval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        todayPurchases: calculateTodayPurchases(prev.totalPurchases)
      }))
    }, 120000 + Math.random() * 180000) // 2-5 minutes

    return () => {
      clearInterval(viewingInterval)
      clearInterval(todayInterval)
    }
  }, [documentId, createdAt])

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
        Purchase stats
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total purchases */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalPurchases.toLocaleString('en-US')}
          </div>
          <div className="text-sm text-gray-600">Total purchases</div>
        </div>

        {/* Today */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            +{stats.todayPurchases}
          </div>
          <div className="text-sm text-gray-600">Today</div>
        </div>

        {/* Viewing now */}
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5 mr-1" />
            {stats.viewingNow}
          </div>
          <div className="text-sm text-gray-600">Viewing now</div>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-center text-sm text-gray-600">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Updated just now
          </span>
        </div>
      </div>
    </div>
  )
}
