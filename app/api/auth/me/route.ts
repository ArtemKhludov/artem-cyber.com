import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    attachSessionCookie,
    clearSessionCookie,
    getSessionErrorMessage,
    validateSessionToken
} from '@/lib/session'
import { verifyRequestOriginSmart } from '@/lib/security'
import { getSupabaseAdmin } from '@/lib/supabase'
import { logDebug, logError, logInfo, logWarn } from '@/lib/logger'

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        
        logDebug('/api/auth/me - session token status', { hasToken: !!sessionToken })
        
        const validation = await validateSessionToken(sessionToken, { supabase: getSupabaseAdmin() })
        
        logDebug('/api/auth/me - validation result', {
            hasSession: !!validation.session,
            hasUser: !!validation.user,
            reason: validation.reason
        })

        if (!validation.session || !validation.user) {
            logWarn('/api/auth/me - session validation failed', { reason: validation.reason })
            
            const response = NextResponse.json({
                error: getSessionErrorMessage(validation.reason)
            }, { status: 401 })

            if (sessionToken) {
                clearSessionCookie(response)
            }

            return response
        }
        
        logInfo('/api/auth/me - session valid', { userEmail: validation.user.email })

        const response = NextResponse.json({
            ...validation.user,
            role: validation.user.role || 'user',
            last_activity: validation.session.last_activity,
            session: {
                ip_address: validation.session.ip_address,
                user_agent: validation.session.user_agent,
                remember_me: Boolean(validation.session.remember_me),
                expires_at: validation.sessionExpiresAt,
                last_activity: validation.session.last_activity,
            }
        })

        if (validation.sessionExpiresAt) {
            response.headers.set('X-Session-Expires-At', validation.sessionExpiresAt)
        }

        if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
            attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
        }

        return response
    } catch (error) {
        logError('Session check error', error as Error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        // Smart origin check for session ping
        try {
            verifyRequestOriginSmart(request, {
                allowSessionPing: true,
                allowSameDomain: true
            })
        } catch (error) {
            logError('Origin verification failed for session ping', error as Error)
            return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
        }

        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase: getSupabaseAdmin() })

        if (!validation.session || !validation.user) {
            const response = NextResponse.json({ success: false, error: getSessionErrorMessage(validation.reason) }, { status: 401 })

            if (sessionToken) {
                clearSessionCookie(response)
            }

            return response
        }

        const response = NextResponse.json({ success: true })

        if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
            attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
        }

        return response
    } catch (error) {
        logError('Session ping error', error as Error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
