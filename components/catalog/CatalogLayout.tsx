'use client'

import { useState } from 'react'
import { MainHeader } from '@/components/layout/MainHeader'
import { MainFooter } from '@/components/layout/MainFooter'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

interface CatalogLayoutProps {
  children: React.ReactNode
}

export function CatalogLayout({ children }: CatalogLayoutProps) {
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
      <MainFooter />
      <CallRequestModal 
        isOpen={isCallModalOpen}
        onClose={handleCloseCallModal}
      />
    </div>
  )
}
