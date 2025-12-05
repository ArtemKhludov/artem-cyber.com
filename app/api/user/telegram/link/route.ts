import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
    SESSION_COOKIE_NAME,
    attachSessionCookie,
    clearSessionCookie,
    getSessionErrorMessage,
    validateSessionToken
} from '@/lib/session'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            const response = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })
            if (sessionToken) clearSessionCookie(response)
            return response
        }

        // Generate unique token for linking
        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Save token to database
        const { data: linkToken, error: tokenError } = await supabase
            .from('telegram_link_tokens')
            .insert({
                user_id: validation.session.user_id,
                token,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single()

        if (tokenError) {
            console.error('Telegram link token creation error:', tokenError)
            return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
        }

        // Get bot token from environment variables
        const botToken = process.env.USER_TELEGRAM_BOT_TOKEN
        if (!botToken) {
            return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 })
        }

        // Create deep-link for Telegram
        const botUsername = process.env.USER_TELEGRAM_BOT_USERNAME || 'your_bot_username'
        const deepLink = `https://t.me/${botUsername}?start=${token}`

        const response = NextResponse.json({
            success: true,
            token,
            deepLink,
            expiresAt: expiresAt.toISOString()
        })

        if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
            attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
        }

        return response

    } catch (error) {
        console.error('Telegram link creation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            const response = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })
            if (sessionToken) clearSessionCookie(response)
            return response
        }

        // Get Telegram linking information
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('telegram_username, telegram_chat_id, notify_telegram_enabled')
            .eq('id', validation.session.user_id)
            .single()

        if (userError) {
            console.error('User fetch error:', userError)
            return NextResponse.json({ error: 'Failed to fetch user information' }, { status: 500 })
        }

        const response = NextResponse.json({
            success: true,
            isLinked: Boolean(user.telegram_chat_id),
            telegramUsername: user.telegram_username,
            notifyEnabled: user.notify_telegram_enabled
        })

        if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
            attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
        }

        return response

    } catch (error) {
        console.error('Telegram link status error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
