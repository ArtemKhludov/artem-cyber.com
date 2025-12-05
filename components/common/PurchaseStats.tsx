'use client'

import { useMemo } from 'react'
import { TrendingUp, Users, Clock } from 'lucide-react'
import { PurchaseStatsService } from '@/lib/documents'

interface PurchaseStatsProps {
  documentId: string
  createdAt: string
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
}

export function PurchaseStats({ 
  documentId, 
  createdAt, 
  className = '',
  variant = 'default'
}: PurchaseStatsProps) {
  
  const stats = useMemo(() => {
    return PurchaseStatsService.calculatePurchaseStats(documentId, createdAt)
  }, [documentId, createdAt])

  const getContainerStyles = () => {
    switch (variant) {
      case 'compact':
        return 'bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100'
      case 'detailed':
        return 'bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100'
      default:
        return 'bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100'
    }
  }

  const getTitleStyles = () => {
    switch (variant) {
      case 'compact':
        return 'text-base font-semibold text-gray-800 mb-3 flex items-center'
      default:
        return 'text-lg font-semibold text-gray-800 mb-4 flex items-center'
    }
  }

  const getGridStyles = () => {
    switch (variant) {
      case 'compact':
        return 'grid grid-cols-2 gap-3'
      case 'detailed':
        return 'grid grid-cols-1 md:grid-cols-3 gap-4'
      default:
        return 'grid grid-cols-1 md:grid-cols-3 gap-4'
    }
  }

  const getValueStyles = () => {
    switch (variant) {
      case 'compact':
        return 'text-lg font-bold'
      default:
        return 'text-2xl font-bold'
    }
  }

  const getLabelStyles = () => {
    return 'text-sm text-gray-600'
  }

  return (
    <div className={`${getContainerStyles()} ${className}`}>
      <h3 className={getTitleStyles()}>
        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
        Purchase stats
      </h3>
      
      <div className={getGridStyles()}>
        {/* Total purchases */}
        <div className="text-center">
          <div className={`${getValueStyles()} text-blue-600`}>
            {stats.total.toLocaleString('en-US')}
          </div>
          <div className={getLabelStyles()}>
            Total purchases
          </div>
        </div>

        {/* Today */}
        <div className="text-center">
          <div className={`${getValueStyles()} text-green-600`}>
            +{stats.today}
          </div>
          <div className={getLabelStyles()}>
            Today
          </div>
        </div>

        {/* Active users (only for detailed/default) */}
        {variant !== 'compact' && (
          <div className="text-center">
            <div className={`${getValueStyles()} text-purple-600 flex items-center justify-center`}>
              <Users className="w-5 h-5 mr-1" />
              {stats.active}
            </div>
            <div className={getLabelStyles()}>
              Watching now
            </div>
          </div>
        )}
      </div>

      {/* Update info */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center justify-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          <span>Updated just now</span>
        </div>
      </div>
    </div>
  )
}
