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
    // If still loading - wait
    if (loading) {
      return
    }

    const isPublicRoute = publicRoutes.includes(pathname)
    const isAuthRoute = authRoutes.includes(pathname)

    // If this is a public page - skip
    if (isPublicRoute) {
      setIsChecking(false)
      return
    }

    // If this is an auth page and user is already authenticated - redirect to home
    if (isAuthRoute && user) {
      router.push('/')
      return
    }

    // If authentication is required but user is not authenticated
    if (requireAuth && !user) {
      // Don't redirect from public pages
      if (!isPublicRoute) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
      }
      return
    }

    // If admin is required but user is not admin
    if (requireAdmin && (!user || user.role !== 'admin')) {
      router.push('/')
      return
    }

    setIsChecking(false)
  }, [user, loading, pathname, router, requireAuth, requireAdmin])

    // Show loading while checking
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <>{children}</>
}
