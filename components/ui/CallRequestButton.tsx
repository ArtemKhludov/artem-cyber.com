'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CallRequestModal } from '@/components/modals/CallRequestModal'
import { Phone } from 'lucide-react'

interface CallRequestButtonProps {
  variant?: 'default' | 'outline' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
  sourcePage?: string
}

export function CallRequestButton({ 
  variant = 'default', 
  size = 'md', 
  className = '',
  children,
  sourcePage 
}: CallRequestButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleClick = () => {
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
  }

  const getButtonClasses = () => {
    const baseClasses = 'transition-all duration-300 transform hover:scale-105'
    
    switch (variant) {
      case 'gradient':
        return `${baseClasses} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl`
      case 'outline':
        return `${baseClasses} border-2 border-blue-200 text-blue-600 hover:border-blue-500 hover:bg-blue-50`
      default:
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white`
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-4 text-sm'
      case 'lg':
        return 'py-4 px-8 text-lg'
      default:
        return 'py-3 px-6'
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        className={`${getButtonClasses()} ${getSizeClasses()} ${className}`}
      >
        <Phone className="w-4 h-4 mr-2" />
        {children || 'Request Call'}
      </Button>

      <CallRequestModal
        isOpen={isModalOpen}
        onClose={handleClose}
        sourcePage={sourcePage || window.location.pathname}
      />
    </>
  )
}
