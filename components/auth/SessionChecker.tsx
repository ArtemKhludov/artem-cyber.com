'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useRef } from 'react'

export function SessionChecker() {
  const { user, loading, refreshSession } = useAuth()
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    // Проверяем сессию только один раз при загрузке
    if (!loading && !user && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      // Проверяем сессию без перенаправления
      refreshSession()
    }
  }, [loading, user, refreshSession])

  // Этот компонент не рендерит ничего, только проверяет сессию
  return null
}
