import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/admin', '/purchases', '/courses']
const publicRoutes = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund', '/checkout/success', '/book', '/pdf']
const SESSION_COOKIE_NAME = 'session_token'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    // Skip all API routes
    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
    const isAuthRoute = pathname.startsWith('/auth/')

    // Debug logging (remove after fixing)
    if (process.env.NODE_ENV === 'production') {
        console.log('[Middleware]', {
            pathname,
            hasToken: !!sessionToken,
            isPublicRoute,
            isProtectedRoute,
            isAuthRoute
        })
    }

    // If this is a public page - always allow
    if (isPublicRoute) {
        const response = NextResponse.next()
        // Add SEO headers for English content
        response.headers.set('Content-Language', 'en')
        response.headers.set('Content-Type', 'text/html; charset=UTF-8')
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'SAMEORIGIN')
        return response
    }

    // If this is an auth page - allow (but check token for redirect)
    if (isAuthRoute) {
        // If token exists and this is login/signup page - redirect to home
        if (sessionToken && (pathname === '/auth/login' || pathname === '/auth/signup')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        const response = NextResponse.next()
        response.headers.set('Content-Language', 'en')
        return response
    }

    // If this is a protected page and no token - redirect to login
    if (isProtectedRoute && !sessionToken) {
        const loginUrl = new URL('/auth/login', request.url)
        const currentPath = pathname + request.nextUrl.search
        loginUrl.searchParams.set('redirect', currentPath)
        return NextResponse.redirect(loginUrl)
    }

    // Add SEO headers for all responses
    const response = NextResponse.next()
    response.headers.set('Content-Language', 'en')
    response.headers.set('Content-Type', 'text/html; charset=UTF-8')
    return response
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
