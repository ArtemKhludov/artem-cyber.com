'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
}

const publicRoutes = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund']
const authRoutes = ['/auth/login', '/auth/signup', '/auth/verify', '/auth/reset-password']

export function RouteGuard({ children, requireAuth = false, requireAdmin = false }: RouteGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Если еще загружается - ждем
    if (loading) {
      return
    }

    const isPublicRoute = publicRoutes.includes(pathname)
    const isAuthRoute = authRoutes.includes(pathname)

    // Если это публичная страница - пропускаем
    if (isPublicRoute) {
      setIsChecking(false)
      return
    }

    // Если это страница авторизации и пользователь уже авторизован - перенаправляем на главную
    if (isAuthRoute && user) {
      router.push('/')
      return
    }

    // Если требуется авторизация, но пользователь не авторизован
    if (requireAuth && !user) {
      // Не перенаправляем с публичных страниц
      if (!isPublicRoute) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
      }
      return
    }

    // Если требуется админ, но пользователь не админ
    if (requireAdmin && (!user || user.role !== 'admin')) {
      router.push('/')
      return
    }

    setIsChecking(false)
  }, [user, loading, pathname, router, requireAuth, requireAdmin])

  // Показываем загрузку пока проверяем
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <>{children}</>
}
