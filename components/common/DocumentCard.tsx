'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, ShoppingCart, FileText } from 'lucide-react'
import type { Document } from '@/types'

interface DocumentCardProps {
  document: Document
  className?: string
  showBuyButton?: boolean
  variant?: 'default' | 'carousel' | 'grid'
}

export function DocumentCard({ 
  document, 
  className = '', 
  showBuyButton = true,
  variant = 'default'
}: DocumentCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageError = () => {
    console.warn(`⚠️ Image failed to load: ${document.cover_url}`)
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const getFallbackGradient = () => {
    const gradients = [
      'bg-gradient-to-br from-blue-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-teal-600',
      'bg-gradient-to-br from-purple-500 to-pink-600',
      'bg-gradient-to-br from-orange-500 to-red-600',
      'bg-gradient-to-br from-indigo-500 to-purple-600',
    ]
    const index = document.title.length % gradients.length
    return gradients[index]
  }

  const getCardStyles = () => {
    switch (variant) {
      case 'carousel':
        return 'bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-2xl transition-all duration-300 group'
      case 'grid':
        return 'bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group'
      default:
        return 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group'
    }
  }

  const getImageContainerStyles = () => {
    switch (variant) {
      case 'carousel':
        return 'relative h-48 overflow-hidden'
      case 'grid':
        return 'relative h-40 overflow-hidden'
      default:
        return 'relative h-48 overflow-hidden'
    }
  }

  const getTitleStyles = () => {
    switch (variant) {
      case 'carousel':
        return 'font-bold text-lg text-white mb-2 line-clamp-2'
      default:
        return 'font-bold text-lg text-gray-900 mb-2 line-clamp-2'
    }
  }

  const getDescriptionStyles = () => {
    switch (variant) {
      case 'carousel':
        return 'text-gray-300 text-sm line-clamp-2 mb-4'
      default:
        return 'text-gray-600 text-sm line-clamp-2 mb-4'
    }
  }

  const getPriceStyles = () => {
    switch (variant) {
      case 'carousel':
        return 'text-xl font-bold text-white'
      default:
        return 'text-xl font-bold text-gray-900'
    }
  }

  return (
    <div className={`${getCardStyles()} ${className}`}>
      <div className={getImageContainerStyles()}>
        {document.cover_url && !imageError ? (
          <>
            <img 
              src={document.cover_url} 
              alt={document.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ display: imageLoading ? 'none' : 'block' }}
            />
            {imageLoading && (
              <div className={`w-full h-full ${getFallbackGradient()} flex items-center justify-center`}>
                <div className="animate-pulse">
                  <FileText className="w-12 h-12 text-white/80" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`w-full h-full ${getFallbackGradient()} flex items-center justify-center`}>
            <FileText className="w-12 h-12 text-white" />
          </div>
        )}
        


        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-lg p-2">
          <FileText className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="p-6">
        <h3 className={getTitleStyles()}>
          {document.title}
        </h3>
        
        <p className={getDescriptionStyles()}>
          {document.description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <span className={getPriceStyles()}>
            {document.price_rub.toLocaleString('ru-RU')} ₽
          </span>
        </div>

        <div className="space-y-2">
          <Link 
            href={`/courses/${document.id}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow hover:bg-primary/90 h-9 px-4 py-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Eye className="mr-2 w-4 h-4" />
            Посмотреть
          </Link>
          
          {showBuyButton && (
            <Link 
              href={`/checkout/${document.id}`}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-sm hover:text-accent-foreground h-9 px-4 py-2 w-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
            >
              <ShoppingCart className="mr-2 w-4 h-4" />
              Купить
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
