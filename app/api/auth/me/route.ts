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

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase: getSupabaseAdmin() })

        if (!validation.session || !validation.user) {
            const response = NextResponse.json({
                error: getSessionErrorMessage(validation.reason)
            }, { status: 401 })

            if (sessionToken) {
                clearSessionCookie(response)
            }

            return response
        }

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
        console.error('Session check error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        // Умная проверка origin для session ping
        try {
            verifyRequestOriginSmart(request, {
                allowSessionPing: true,
                allowSameDomain: true
            })
        } catch (error) {
            console.error('Origin verification failed for session ping:', error)
            return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 })
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
        console.error('Session ping error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
