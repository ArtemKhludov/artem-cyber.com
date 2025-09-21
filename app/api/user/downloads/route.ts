import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
    SESSION_COOKIE_NAME,
    validateSessionToken,
    getSessionErrorMessage,
    clearSessionCookie,
    attachSessionCookie,
} from '@/lib/session'

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            const res = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })
            if (sessionToken) clearSessionCookie(res)
            return res
        }

        const userId = validation.session.user_id

        const { data, error } = await supabase
            .from('audit_logs')
            .select('id, action, target_table, target_id, metadata, created_at')
            .eq('actor_id', userId)
            .or('action.eq.signed_url_issued,action.eq.material_download')
            .order('created_at', { ascending: false })
            .limit(200)

        if (error) {
            return NextResponse.json({ error: 'Failed to load downloads history' }, { status: 500 })
        }

        const response = NextResponse.json({ success: true, data })
        if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
            attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
        }
        return response
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}


