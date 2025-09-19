import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
    SESSION_COOKIE_NAME,
    attachSessionCookie,
    clearSessionCookie,
    getSessionErrorMessage,
    validateSessionToken,
} from '@/lib/session'

export const runtime = 'nodejs'

export async function HEAD() {
    return new NextResponse(null, { status: 200 })
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const documentId = searchParams.get('documentId') || searchParams.get('courseId') || ''
        const path = searchParams.get('path') || ''
        const bucket = searchParams.get('bucket') || 'course-materials'
        const expiresInParam = Number(searchParams.get('expiresIn') || '120')

        if (!documentId || !path) {
            return NextResponse.json({ error: 'documentId and path are required' }, { status: 400 })
        }

        // Basic path hardening: require course/<documentId>/ prefix
        const expectedPrefix = `course/${documentId}/`
        if (!path.startsWith(expectedPrefix)) {
            return NextResponse.json({ error: 'Invalid path for documentId' }, { status: 400 })
        }

        const expiresIn = Math.min(Math.max(expiresInParam, 30), 600) // clamp 30..600 sec

        const supabase = getSupabaseAdmin()

        // Session validation
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            const response = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })
            if (sessionToken) clearSessionCookie(response)
            return response
        }

        const userId = validation.session.user_id
        const userEmail = validation.user.email

        // Permission check: prefer user_course_access if table exists, fallback to purchases
        let permitted = false

        // Try user_course_access
        try {
            const { data: uca, error: ucaErr } = await supabase
                .from('user_course_access')
                .select('id')
                .eq('user_id', userId)
                .eq('document_id', documentId)
                .is('revoked_at', null)
                .maybeSingle()

            if (!ucaErr && uca) {
                permitted = true
            }
        } catch {
            // Table may not exist in current schema; ignore
        }

        if (!permitted) {
            // Fallback to purchases
            const { data: purchase, error: pErr } = await supabase
                .from('purchases')
                .select('id')
                .eq('document_id', documentId)
                .eq('payment_status', 'completed')
                .or(`user_id.eq.${userId},user_email.eq.${userEmail}`)
                .maybeSingle()

            if (!pErr && purchase) {
                permitted = true
            }
        }

        if (!permitted) {
            return NextResponse.json({ error: 'Нет доступа к материалу' }, { status: 403 })
        }

        // Generate short-lived signed URL
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn)

        if (error || !data?.signedUrl) {
            return NextResponse.json({ error: 'Не удалось создать ссылку' }, { status: 500 })
        }

        const response = NextResponse.json({
            success: true,
            url: data.signedUrl,
            expiresIn,
            path,
            bucket,
        })

        // Refresh session cookie if sliding window advanced
        if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
            attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
        }

        response.headers.set('Cache-Control', 'no-store')
        return response
    } catch (error) {
        console.error('Signed URL API error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}


