'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function SessionChecker() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })

                if (response.ok) {
                    // Сессия валидна
                    if (pathname === '/auth/login' && searchParams.get('check_session') === 'true') {
                        router.push('/dashboard')
                    }
                    // На других страницах ничего не делаем
                } else {
                    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
                        const redirect = `/auth/login?redirect=${encodeURIComponent(current)}`
                        router.push(redirect)
                    }
                }
            } catch (error) {
                console.error('Ошибка проверки сессии:', error)
            }
        }

        // Проверяем сессию только если:
        // 1. Есть параметр check_session на странице логина
        // 2. Или мы на защищенной странице
        if ((pathname === '/auth/login' && searchParams.get('check_session') === 'true') ||
            pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
            checkSession()
        }
    }, [router, searchParams, pathname])

    return null
}
