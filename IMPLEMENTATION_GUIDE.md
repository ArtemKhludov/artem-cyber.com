# 🛠️ Implementation Guide
## Step-by-Step Security & Architecture Improvements

---

## Phase 1: Critical Security Fixes (Week 1)

### Step 1.1: Remove Debug Logging

**File:** `middleware.ts`

```typescript
// ❌ REMOVE THIS
if (process.env.NODE_ENV === 'production') {
    console.log('[Middleware]', {...})
}

// ✅ REPLACE WITH
if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware]', {...})
}
```

**File:** `lib/session.ts`

```typescript
// ❌ REMOVE
console.log(`🔍 validateSessionToken: Looking for session token: ${sessionToken}`)

// ✅ REPLACE WITH
if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 validateSessionToken: Token present: ${!!sessionToken}`)
}
```

**File:** `app/api/auth/me/route.ts`

```typescript
// ❌ REMOVE ALL console.log statements

// ✅ Use proper logging service
import { logInfo, logError } from '@/lib/logger'

logInfo('auth/me', { hasToken: !!sessionToken })
```

### Step 1.2: Add Security Headers

**File:** `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.google.com",
              "frame-src https://www.google.com",
            ].join('; ')
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_SITE_URL || '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          }
        ]
      }
    ]
  },
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '8mb',
  }
};

export default nextConfig;
```

### Step 1.3: Protect API Routes in Middleware

**File:** `middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/admin', '/purchases', '/courses']
const publicRoutes = ['/', '/catalog', '/about', '/contacts', '/reviews', '/terms', '/privacy', '/disclaimer', '/refund', '/checkout/success', '/book', '/pdf']
const SESSION_COOKIE_NAME = 'session_token'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    // Create response with security headers
    const response = NextResponse.next()
    
    // Security headers for all routes
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Content-Language', 'en')
    
    // API routes - add CORS and security
    if (pathname.startsWith('/api/')) {
        const origin = request.headers.get('origin')
        const allowedOrigins = [
            process.env.NEXT_PUBLIC_SITE_URL,
            'https://energylogic-ai.com',
            // Add mobile app origins when ready
        ].filter(Boolean)
        
        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin)
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.set('Access-Control-Allow-Credentials', 'true')
        }
        
        // Handle preflight
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
        response.headers.set('Content-Type', 'text/html; charset=UTF-8')
        return response
    }

    // If this is an auth page - allow (but check token for redirect)
    if (isAuthRoute) {
        if (sessionToken && (pathname === '/auth/login' || pathname === '/auth/signup')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return response
    }

    // If this is a protected page and no token - redirect to login
    if (isProtectedRoute && !sessionToken) {
        const loginUrl = new URL('/auth/login', request.url)
        const currentPath = pathname + request.nextUrl.search
        loginUrl.searchParams.set('redirect', currentPath)
        return NextResponse.redirect(loginUrl)
    }

    return response
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
    ],
}
```

---

## Phase 2: API Authentication Middleware (Week 1-2)

### Step 2.1: Create API Auth Helper

**File:** `lib/api-auth.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken } from './session'
import { SESSION_COOKIE_NAME } from './session'

export interface AuthContext {
    user: {
        id: string
        email: string
        name: string
        role?: string
    }
    session: {
        session_token: string
        user_id: string
    }
}

export async function requireAuth(request: NextRequest): Promise<
    | { success: true; context: AuthContext }
    | { success: false; response: NextResponse }
> {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
        return {
            success: false,
            response: NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }
    }

    const validation = await validateSessionToken(token)

    if (!validation.session || !validation.user) {
        return {
            success: false,
            response: NextResponse.json(
                { error: 'Invalid session' },
                { status: 401 }
            )
        }
    }

    return {
        success: true,
        context: {
            user: validation.user,
            session: validation.session
        }
    }
}

export async function requireAdmin(request: NextRequest): Promise<
    | { success: true; context: AuthContext }
    | { success: false; response: NextResponse }
> {
    const auth = await requireAuth(request)
    
    if (!auth.success) {
        return auth
    }

    if (auth.context.user.role !== 'admin') {
        return {
            success: false,
            response: NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
            )
        }
    }

    return auth
}
```

### Step 2.2: Use in API Routes

**Example:** `app/api/user/me/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request)
    
    if (!auth.success) {
        return auth.response
    }

    return NextResponse.json({
        user: {
            id: auth.context.user.id,
            email: auth.context.user.email,
            name: auth.context.user.name,
            role: auth.context.user.role
        }
    })
}
```

---

## Phase 3: API Versioning (Week 2-3)

### Step 3.1: Create v1 Directory Structure

```bash
mkdir -p app/api/v1/{auth,users,courses,purchases,notifications}
```

### Step 3.2: Create Mobile Login Endpoint

**File:** `app/api/v1/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateJWT, generateRefreshToken } from '@/lib/jwt'
import { verifyRequestOrigin } from '@/lib/security'
import { getRateLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
    try {
        verifyRequestOrigin(request)
    } catch {
        return NextResponse.json(
            { error: 'Request rejected' },
            { status: 403 }
        )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
        return NextResponse.json(
            { error: 'Email and password are required' },
            { status: 400 }
        )
    }

    // Rate limiting
    const ipLimiter = getRateLimiter('auth:login:ip', {
        windowMs: 15 * 60 * 1000,
        maxAttempts: 10,
        blockDurationMs: 30 * 60 * 1000,
        captchaThreshold: 5
    })

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const check = ipLimiter.check(clientIp)

    if (check.blocked) {
        return NextResponse.json(
            { error: 'Too many attempts' },
            { status: 429 }
        )
    }

    const supabase = getSupabaseAdmin()
    const normalizedEmail = email.toLowerCase().trim()

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .single()

    if (error || !user) {
        ipLimiter.recordFailure(clientIp)
        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        )
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
        ipLimiter.recordFailure(clientIp)
        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        )
    }

    ipLimiter.recordSuccess(clientIp)

    // Generate tokens
    const accessToken = generateJWT(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id)

    // Store refresh token
    await supabase.from('refresh_tokens').insert({
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })

    return NextResponse.json({
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        }
    })
}
```

### Step 3.3: Create JWT Utilities

**File:** `lib/jwt.ts`

```typescript
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured')
}

export interface JWTPayload {
    userId: string
    email: string
    iat?: number
    exp?: number
}

export interface RefreshPayload {
    userId: string
    type: 'refresh'
    iat?: number
    exp?: number
}

export function generateJWT(userId: string, email: string): string {
    return jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: '15m' }
    )
}

export function generateRefreshToken(userId: string): string {
    return jwt.sign(
        { userId, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    )
}

export function verifyJWT(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export function verifyRefreshToken(token: string): RefreshPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshPayload
}
```

---

## Phase 4: Request Validation (Week 3)

### Step 4.1: Create Validation Middleware

**File:** `lib/validate-request.ts`

```typescript
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

export function validateRequest<T extends z.ZodType>(
    schema: T,
    handler: (req: NextRequest, data: z.infer<T>) => Promise<NextResponse>
) {
    return async (req: NextRequest) => {
        try {
            const body = await req.json()
            const data = schema.parse(body)
            return handler(req, data)
        } catch (error) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    {
                        error: 'Validation failed',
                        details: error.errors.map(e => ({
                            path: e.path.join('.'),
                            message: e.message
                        }))
                    },
                    { status: 400 }
                )
            }
            throw error
        }
    }
}

// Example usage
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    remember: z.boolean().optional()
})

export const POST = validateRequest(loginSchema, async (req, data) => {
    // data is typed and validated
    // ...
})
```

---

## Phase 5: Logging Service (Week 3)

### Step 5.1: Create Logger

**File:** `lib/logger.ts`

```typescript
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
    [key: string]: any
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development'

    private log(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString()
        const logEntry = {
            timestamp,
            level,
            message,
            ...context
        }

        if (this.isDevelopment) {
            console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry, null, 2))
        } else {
            // Send to logging service (Sentry, LogRocket, etc.)
            // Sentry.captureMessage(message, { level, extra: context })
        }
    }

    info(message: string, context?: LogContext) {
        this.log('info', message, context)
    }

    warn(message: string, context?: LogContext) {
        this.log('warn', message, context)
    }

    error(message: string, error?: Error, context?: LogContext) {
        this.log('error', message, {
            ...context,
            error: error?.message,
            stack: error?.stack
        })
    }

    debug(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            this.log('debug', message, context)
        }
    }
}

export const logger = new Logger()

// Convenience functions
export function logInfo(message: string, context?: LogContext) {
    logger.info(message, context)
}

export function logError(message: string, error?: Error, context?: LogContext) {
    logger.error(message, error, context)
}

export function logWarn(message: string, context?: LogContext) {
    logger.warn(message, context)
}
```

---

## Phase 6: Mobile App Setup (Week 4-8)

### Step 6.1: Initialize React Native Project

```bash
# Using Expo (recommended for faster development)
npx create-expo-app energylogic-mobile --template

# Or React Native CLI
npx react-native init EnergylogicMobile
```

### Step 6.2: Install Dependencies

```bash
cd energylogic-mobile
npm install axios react-native-keychain @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/stack
npm install zustand react-query
```

### Step 6.3: Create API Client

**File:** `mobile/src/api/client.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios'
import * as Keychain from 'react-native-keychain'

const API_BASE_URL = __DEV__
    ? 'http://localhost:3000/api/v1'
    : 'https://energylogic-ai.com/api/v1'

class APIClient {
    private client: AxiosInstance

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        this.setupInterceptors()
    }

    private setupInterceptors() {
        // Request interceptor - add token
        this.client.interceptors.request.use(
            async (config) => {
                const credentials = await Keychain.getGenericPassword()
                if (credentials && credentials.password) {
                    config.headers.Authorization = `Bearer ${credentials.password}`
                }
                return config
            },
            (error) => Promise.reject(error)
        )

        // Response interceptor - handle token refresh
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as any

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true

                    try {
                        const credentials = await Keychain.getGenericPassword()
                        if (credentials) {
                            const refreshToken = await Keychain.getInternetCredentials('refreshToken')
                            
                            if (refreshToken && refreshToken.password) {
                                const response = await axios.post(
                                    `${API_BASE_URL}/auth/refresh`,
                                    { refreshToken: refreshToken.password }
                                )

                                const { accessToken } = response.data
                                await Keychain.setGenericPassword('token', accessToken)

                                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                                return this.client(originalRequest)
                            }
                        }
                    } catch (refreshError) {
                        // Refresh failed - redirect to login
                        await Keychain.resetGenericPassword()
                        // Navigate to login screen
                        return Promise.reject(refreshError)
                    }
                }

                return Promise.reject(error)
            }
        )
    }

    async login(email: string, password: string) {
        const response = await this.client.post('/auth/login', { email, password })
        const { accessToken, refreshToken, user } = response.data

        await Keychain.setGenericPassword('token', accessToken)
        await Keychain.setInternetCredentials('refreshToken', 'refresh', refreshToken)

        return { user, accessToken }
    }

    async getCourses() {
        const response = await this.client.get('/courses')
        return response.data
    }

    async getPurchases() {
        const response = await this.client.get('/purchases')
        return response.data
    }
}

export const apiClient = new APIClient()
```

---

## 📋 Environment Variables

Add to `.env.local`:

```bash
# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# CORS
NEXT_PUBLIC_ALLOWED_ORIGINS=https://energylogic-ai.com,https://app.energylogic-ai.com

# Mobile App IDs (when ready)
NEXT_PUBLIC_MOBILE_IOS_BUNDLE_ID=com.energylogic.app
NEXT_PUBLIC_MOBILE_ANDROID_PACKAGE=com.energylogic.app

# Logging
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

---

## ✅ Testing Checklist

### Security Tests
- [ ] All console.log removed from production
- [ ] Security headers present on all responses
- [ ] API routes require authentication
- [ ] Rate limiting works
- [ ] CORS configured correctly
- [ ] JWT tokens expire correctly
- [ ] Refresh tokens work

### API Tests
- [ ] `/api/v1/auth/login` returns JWT
- [ ] `/api/v1/auth/refresh` works
- [ ] `/api/v1/courses` requires auth
- [ ] Validation middleware works
- [ ] Error responses are consistent

### Mobile Tests
- [ ] Login flow works
- [ ] Token storage secure
- [ ] Auto-refresh on 401
- [ ] Offline handling
- [ ] Push notifications

---

**Last Updated:** December 2024

