import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateJWT, generateRefreshToken } from '@/lib/jwt'
import { verifyRequestOrigin } from '@/lib/security'
import { getRateLimiter } from '@/lib/rate-limit'
import { validateRequest, schemas } from '@/lib/validate-request'
import { logError, logInfo } from '@/lib/logger'

const MINUTE_MS = 60 * 1000
const LOGIN_WINDOW_MS = 15 * MINUTE_MS
const LOGIN_BLOCK_MS = 30 * MINUTE_MS
const LOGIN_MAX_ATTEMPTS = 10
const LOGIN_CAPTCHA_THRESHOLD = 5

const ipLimiter = getRateLimiter('auth:login:ip:v1', {
  windowMs: LOGIN_WINDOW_MS,
  blockDurationMs: LOGIN_BLOCK_MS,
  maxAttempts: LOGIN_MAX_ATTEMPTS,
  captchaThreshold: LOGIN_CAPTCHA_THRESHOLD,
})

/**
 * Mobile-optimized login endpoint
 * Returns JWT tokens instead of session cookies
 */
export const POST = validateRequest(schemas.login, async (request: NextRequest, data) => {
  try {
    // Verify request origin
    try {
      verifyRequestOrigin(request)
    } catch {
      return NextResponse.json(
        { error: 'Request rejected' },
        { status: 403 }
      )
    }

    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    ipLimiter.cleanup()
    const check = ipLimiter.check(clientIp)

    if (check.blocked) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: check.blockedUntil 
        },
        { status: 429 }
      )
    }

    const supabase = getSupabaseAdmin()
    const normalizedEmail = data.email.toLowerCase().trim()

    // Fetch user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (userError || !user) {
      ipLimiter.recordFailure(clientIp)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Validate password
    const isValid = await bcrypt.compare(data.password, user.password_hash)
    if (!isValid) {
      ipLimiter.recordFailure(clientIp)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    ipLimiter.recordSuccess(clientIp)

    // Generate JWT tokens
    let accessToken: string
    let refreshToken: string

    try {
      accessToken = generateJWT(user.id, user.email)
      refreshToken = generateRefreshToken(user.id)
    } catch (error) {
      logError('JWT generation failed', error as Error)
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 500 }
      )
    }

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error: tokenError } = await supabase
      .from('refresh_tokens')
      .insert({
        token: refreshToken,
        user_id: user.id,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })

    if (tokenError) {
      logError('Failed to store refresh token', tokenError as Error)
      // Continue anyway - token is generated
    }

    logInfo('Mobile login successful', { userId: user.id, email: user.email })

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    })
  } catch (error) {
    logError('Login error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

