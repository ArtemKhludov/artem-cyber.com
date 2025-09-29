import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/admin', '/purchases', '/courses']
const publicRoutes = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund', '/auth/login', '/auth/signup', '/auth/verify', '/auth/reset-password', '/checkout/success']
const SESSION_COOKIE_NAME = 'session_token'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
    const isAuthRoute = pathname.startsWith('/auth/')

    // Если это публичная страница или страница авторизации - пропускаем
    if (isPublicRoute || isAuthRoute) {
        return NextResponse.next()
    }

    // Если это защищенная страница и нет токена - перенаправляем на логин
    if (isProtectedRoute && !sessionToken) {
        const loginUrl = new URL('/auth/login', request.url)
        const currentPath = pathname + request.nextUrl.search
        loginUrl.searchParams.set('redirect', currentPath)
        return NextResponse.redirect(loginUrl)
    }

    // Если есть токен, но это страница логина - перенаправляем на главную
    if (isAuthRoute && sessionToken && (pathname === '/auth/login' || pathname === '/auth/signup')) {
        return NextResponse.redirect(new URL('/', request.url))
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
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
