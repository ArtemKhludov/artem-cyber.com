import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/admin', '/purchases', '/courses']
const publicRoutes = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund', '/checkout/success', '/book', '/pdf']
const SESSION_COOKIE_NAME = 'session_token'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    // Handle API routes with security headers
    if (pathname.startsWith('/api/')) {
        const response = NextResponse.next()
        
        // Security headers for API routes
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('Content-Language', 'en')
        
        // CORS headers for mobile apps (when ready)
        const origin = request.headers.get('origin')
        const allowedOrigins = [
            process.env.NEXT_PUBLIC_SITE_URL,
            'https://energylogic-ai.com',
            // Add mobile app origins when ready
            // process.env.NEXT_PUBLIC_MOBILE_IOS_URL,
            // process.env.NEXT_PUBLIC_MOBILE_ANDROID_URL,
        ].filter(Boolean) as string[]
        
        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin)
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.set('Access-Control-Allow-Credentials', 'true')
        }
        
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204, headers: response.headers })
        }
        
        return response
    }

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
    const isAuthRoute = pathname.startsWith('/auth/')

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
