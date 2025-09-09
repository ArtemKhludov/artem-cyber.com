'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function SessionChecker() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/auth/me')

                if (response.ok) {
                    // Сессия валидна
                    if (pathname === '/auth/login' && searchParams.get('check_session') === 'true') {
                        // На странице логина с проверкой - перенаправляем на dashboard
                        router.push('/dashboard')
                    }
                    // На других страницах ничего не делаем
                } else {
                    // Сессия невалидна - очищаем cookie
                    document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

                    // Если мы на защищенной странице - перенаправляем на логин
                    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
                        router.push('/auth/login')
                    }
                }
            } catch (error) {
                console.error('Ошибка проверки сессии:', error)
                // При ошибке тоже очищаем cookie
                document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
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
