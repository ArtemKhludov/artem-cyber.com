import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    attachSessionCookie,
    clearSessionCookie,
    getSessionErrorMessage,
    validateSessionToken
} from '@/lib/session'
import { verifyRequestOrigin } from '@/lib/security'

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken)

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
        try {
            verifyRequestOrigin(request)
        } catch (error) {
            if (error instanceof Error) {
                return NextResponse.json({ error: error.message }, { status: 403 })
            }
            return NextResponse.json({ error: 'Запрос отклонен' }, { status: 403 })
        }

        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken)

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
