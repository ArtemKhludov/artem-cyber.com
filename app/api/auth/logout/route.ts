import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME, clearSessionCookie, revokeSessionToken } from '@/lib/session'
import { verifyRequestOrigin } from '@/lib/security'

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

        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (sessionToken) {
            const supabase = getSupabaseAdmin()
            await revokeSessionToken(sessionToken, { supabase })
        }

        const response = NextResponse.json({ message: 'Logout successful' })
        clearSessionCookie(response)

        return response
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
