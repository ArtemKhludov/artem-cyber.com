'use client'

import { useState } from 'react'
import { MainHeader } from './MainHeader'
import { Footer } from './footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

interface PageLayoutProps {
  children: React.ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader onCallRequest={handleCallRequest} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <CallRequestModal 
        isOpen={isCallModalOpen}
        onClose={handleCloseCallModal}
      />
    </div>
  )
}
