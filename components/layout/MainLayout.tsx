'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MainHeader } from './MainHeader'
import { MainFooter } from './MainFooter'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const pathname = usePathname()

  // Check if this is the home page
  const isHomePage = pathname === '/'

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Show MainHeader for all pages */}
      <MainHeader onCallRequest={handleCallRequest} />

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Show MainFooter for all pages except home */}
      {!isHomePage && <MainFooter />}

      {/* Call request modal */}
      <CallRequestModal
        isOpen={isCallModalOpen}
        onClose={handleCloseCallModal}
      />
    </div>
  )
}
