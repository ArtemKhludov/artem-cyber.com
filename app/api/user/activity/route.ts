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

const ALLOWED_ACTION_PREFIXES = ['course_', 'material_', 'dashboard_']

const isActionAllowed = (action: string) => {
  return ALLOWED_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix))
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

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '15'), 1), 50)

    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, target_table, target_id, metadata, created_at')
      .eq('actor_id', validation.session.user_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('User activity fetch error:', error)
      return NextResponse.json({ error: 'Не удалось загрузить историю активности' }, { status: 500 })
    }

    const response = NextResponse.json({
      success: true,
      activity: (data || []).map((item) => ({
        id: item.id,
        action: item.action,
        targetTable: item.target_table,
        targetId: item.target_id,
        metadata: item.metadata || {},
        occurredAt: item.created_at
      }))
    })

    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }

    return response
  } catch (error) {
    console.error('User activity GET error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action : ''
    if (!action || !isActionAllowed(action)) {
      return NextResponse.json({ error: 'Недопустимое действие' }, { status: 400 })
    }

    const metadata = typeof body?.metadata === 'object' && body.metadata ? body.metadata : {}
    const targetTable = typeof body?.targetTable === 'string' ? body.targetTable : null
    const targetId = typeof body?.targetId === 'string' ? body.targetId : null

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: validation.session.user_id,
        actor_email: validation.user.email,
        action,
        target_table: targetTable,
        target_id: targetId,
        metadata,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        user_agent: request.headers.get('user-agent') ?? null
      })

    if (error) {
      console.error('User activity log error:', error)
      return NextResponse.json({ error: 'Не удалось сохранить активность' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true })

    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }

    return response
  } catch (error) {
    console.error('User activity POST error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
