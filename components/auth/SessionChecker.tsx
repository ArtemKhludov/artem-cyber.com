'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useRef } from 'react'

export function SessionChecker() {
  const { user, loading, refreshSession } = useAuth()
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    // Check session only once on load
    if (!loading && !user && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      // Check session without redirect
      refreshSession()
    }
  }, [loading, user, refreshSession])

  // This component doesn't render anything, only checks session
  return null
}
