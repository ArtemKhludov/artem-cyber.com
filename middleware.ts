import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Защищенные маршруты
const protectedRoutes = ['/dashboard', '/admin']
const authRoutes = ['/auth/login', '/auth/signup']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionToken = request.cookies.get('session_token')?.value

    // Проверяем, является ли маршрут защищенным
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

    // Если пользователь на защищенном маршруте без сессии
    if (isProtectedRoute && !sessionToken) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Если пользователь на странице авторизации с активной сессией
    // НО только если сессия действительно валидна
    // НЕ перенаправляем автоматически на dashboard - пусть SessionChecker решает

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
