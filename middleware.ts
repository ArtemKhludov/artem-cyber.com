import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/admin', '/purchases', '/courses']
const publicRoutes = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund', '/checkout/success', '/book', '/pdf']
const SESSION_COOKIE_NAME = 'session_token'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    // Пропускаем все API routes
    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
    const isAuthRoute = pathname.startsWith('/auth/')

    // Логирование для дебага (удалить после исправления)
    if (process.env.NODE_ENV === 'production') {
        console.log('[Middleware]', {
            pathname,
            hasToken: !!sessionToken,
            isPublicRoute,
            isProtectedRoute,
            isAuthRoute
        })
    }

    // Если это публичная страница - всегда пропускаем
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // Если это страница авторизации - пропускаем (но проверяем токен для редиректа)
    if (isAuthRoute) {
        // Если есть токен и это страница логина/регистрации - перенаправляем на главную
        if (sessionToken && (pathname === '/auth/login' || pathname === '/auth/signup')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.next()
    }

    // Если это защищенная страница и нет токена - перенаправляем на логин
    if (isProtectedRoute && !sessionToken) {
        const loginUrl = new URL('/auth/login', request.url)
        const currentPath = pathname + request.nextUrl.search
        loginUrl.searchParams.set('redirect', currentPath)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
    ],
}
