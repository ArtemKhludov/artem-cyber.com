import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
    SESSION_COOKIE_NAME,
    attachSessionCookie,
    getSessionDurations,
    revokeSessionToken
} from '@/lib/session'
import { getClientIp, getUserAgent, verifyRecaptchaToken, verifyRequestOrigin } from '@/lib/security'
import { getRateLimiter } from '@/lib/rate-limit'

const MINUTE_MS = 60 * 1000
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES ?? '15') * MINUTE_MS
const LOGIN_BLOCK_MS = Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MINUTES ?? '30') * MINUTE_MS
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS ?? '10')
const LOGIN_CAPTCHA_THRESHOLD = Number(process.env.LOGIN_RATE_LIMIT_CAPTCHA_THRESHOLD ?? '3')

const userLimiter = getRateLimiter('auth:login:user', {
    windowMs: LOGIN_WINDOW_MS,
    blockDurationMs: LOGIN_BLOCK_MS,
    maxAttempts: LOGIN_MAX_ATTEMPTS,
    captchaThreshold: LOGIN_CAPTCHA_THRESHOLD,
})

const ipLimiter = getRateLimiter('auth:login:ip', {
    windowMs: LOGIN_WINDOW_MS,
    blockDurationMs: LOGIN_BLOCK_MS,
    maxAttempts: LOGIN_MAX_ATTEMPTS * 2,
    captchaThreshold: LOGIN_CAPTCHA_THRESHOLD + 1,
})

export async function POST(request: NextRequest) {
    try {
        try {
            verifyRequestOrigin(request)
        } catch (error) {
            if (error instanceof Error) {
                return NextResponse.json({ error: error.message }, { status: 403 })
            }
            return NextResponse.json({ error: 'Request rejected' }, { status: 403 })
        }

        const { email, password, remember = false, recaptchaToken } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        userLimiter.cleanup()
        ipLimiter.cleanup()

        const normalizedEmail = String(email).toLowerCase().trim()
        const clientIp = getClientIp(request)
        const userKey = `${normalizedEmail}::${clientIp ?? 'unknown'}`
        const ipKey = clientIp ?? request.headers.get('x-real-ip') ?? 'unknown'

        const userCheck = userLimiter.check(userKey)
        const ipCheck = ipLimiter.check(ipKey)

        if (userCheck.blocked || ipCheck.blocked) {
            const blockedUntil = Math.max(
                userCheck.blockedUntil ?? 0,
                ipCheck.blockedUntil ?? 0
            )
            return NextResponse.json({
                error: 'Too many login attempts. Please try again later.',
                lockedUntil: blockedUntil ? new Date(blockedUntil).toISOString() : undefined
            }, { status: 429 })
        }

        const captchaRequired = userCheck.requiresCaptcha || ipCheck.requiresCaptcha

        if (captchaRequired) {
            const captchaValid = await verifyRecaptchaToken(recaptchaToken, clientIp)
            if (!captchaValid) {
                ipLimiter.recordFailure(ipKey)
                userLimiter.recordFailure(userKey)
                return NextResponse.json({
                    error: 'Please confirm you are not a robot',
                    captchaRequired: true
                }, { status: 403 })
            }
        }

        const supabase = getSupabaseAdmin()

        // Fetch user by email
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .single()

        if (userError || !user) {
            ipLimiter.recordFailure(ipKey)
            userLimiter.recordFailure(userKey)
            return NextResponse.json({ error: 'User with this email is not registered' }, { status: 401 })
        }

        // Validate password
        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
            ipLimiter.recordFailure(ipKey)
            userLimiter.recordFailure(userKey)
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
        }

        userLimiter.recordSuccess(userKey)
        ipLimiter.recordSuccess(ipKey)

        const rememberMe = Boolean(remember)
        const { idleMs } = getSessionDurations(rememberMe)
        const now = new Date()
        const sessionToken = crypto.randomUUID()
        const expiresAt = new Date(now.getTime() + idleMs)
        const userAgent = getUserAgent(request)
        const csrfSecret = crypto.randomUUID()

        const { error: sessionError } = await supabase
            .from('user_sessions')
            .insert({
                user_id: user.id,
                session_token: sessionToken,
                expires_at: expiresAt.toISOString(),
                last_activity: now.toISOString(),
                revoked_at: null,
                remember_me: rememberMe,
                ip_address: clientIp ?? null,
                user_agent: userAgent ?? null,
                csrf_secret: csrfSecret
            })

        if (sessionError) {
            console.error('Session creation error:', sessionError)
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
        }

        const cookieStore = await cookies()
        const previousToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (previousToken && previousToken !== sessionToken) {
            await revokeSessionToken(previousToken, { supabase })
        }

        const cookieMaxAgeSeconds = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))

        // Return user data without password
        const { password_hash, ...userWithoutPassword } = user
        const response = NextResponse.json({
            user: userWithoutPassword,
            session: {
                remember: rememberMe,
                expiresAt: expiresAt.toISOString(),
                ip: clientIp ?? null
            }
        })

        response.headers.set('X-Session-Expires-At', expiresAt.toISOString())
        response.headers.set('X-Session-Remember-Me', rememberMe ? '1' : '0')
        attachSessionCookie(response, sessionToken, cookieMaxAgeSeconds)

        return response
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
