import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    attachSessionCookie,
    getSessionDurations,
    revokeSessionToken
} from '@/lib/session'
import { getClientIp, getUserAgent, verifyRequestOrigin } from '@/lib/security'

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        const state = url.searchParams.get('state')

        if (error) {
            console.error('Google OAuth error:', error)
            return NextResponse.redirect(new URL('/auth/login?error=oauth_error', request.url))
        }

        if (!code) {
            return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
        }

        // Parse state if provided
        let stateData = null
        if (state) {
            try {
                stateData = JSON.parse(decodeURIComponent(state))
            } catch (e) {
                console.warn('Failed to parse state:', e)
            }
        }

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/oauth/google/callback'

        if (!clientId || !clientSecret) {
            console.error('Google OAuth env vars missing')
            return NextResponse.redirect(new URL('/auth/login?error=oauth_not_configured', request.url))
        }

        // Exchange code for token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        })

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text()
            console.error('Google token exchange failed:', tokenResponse.status, errorText)
            return NextResponse.redirect(new URL('/auth/login?error=token_exchange_failed', request.url))
        }

        const tokenData = await tokenResponse.json()
        const { access_token } = tokenData

        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        })

        if (!userResponse.ok) {
            console.error('Google user info failed:', userResponse.status)
            return NextResponse.redirect(new URL('/auth/login?error=user_info_failed', request.url))
        }

        const googleUser = await userResponse.json()
        const { id: googleId, email, name, picture } = googleUser

        if (!email) {
            return NextResponse.redirect(new URL('/auth/login?error=no_email', request.url))
        }

        const supabase = getSupabaseAdmin()

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        let userId: string

        if (existingUser) {
            // Update existing user with Google ID
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    google_id: googleId,
                    avatar_url: picture,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingUser.id)
                .select()
                .single()

            if (updateError) {
                console.error('Error updating user:', updateError)
                return NextResponse.redirect(new URL('/auth/login?error=update_failed', request.url))
            }

            userId = updatedUser.id
        } else {
            // Create new user
            const userName = stateData?.name || name || email.split('@')[0]
            const userPhone = stateData?.phone || null
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email,
                    name: userName,
                    phone: userPhone,
                    google_id: googleId,
                    avatar_url: picture,
                    email_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()

            if (createError) {
                console.error('Error creating user:', createError)
                return NextResponse.redirect(new URL('/auth/login?error=create_failed', request.url))
            }

            userId = newUser.id
        }

        // Create session
        const { sessionToken, expiresAt } = await createSession(userId, request)

        // Set session cookie
        const cookieStore = await cookies()
        const durations = getSessionDurations(true)
        
        cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: Math.floor(durations.absoluteMs / 1000),
            path: '/'
        })

        // Redirect based on source
        const redirectUrl = stateData?.source === 'modal' ? '/dashboard' : '/dashboard'
        return NextResponse.redirect(new URL(redirectUrl, request.url))

    } catch (error) {
        console.error('Google OAuth callback error:', error)
        return NextResponse.redirect(new URL('/auth/login?error=callback_error', request.url))
    }
}

async function createSession(userId: string, request: NextRequest) {
    const supabase = getSupabaseAdmin()
    const ip = getClientIp(request)
    const userAgent = getUserAgent(request)
    const durations = getSessionDurations(true)
    const expiresAt = new Date(Date.now() + durations.absoluteMs)

    const { data: session, error } = await supabase
        .from('user_sessions')
        .insert({
            user_id: userId,
            ip_address: ip,
            user_agent: userAgent,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Session creation failed: ${error.message}`)
    }

    return {
        sessionToken: session.id,
        expiresAt
    }
}
