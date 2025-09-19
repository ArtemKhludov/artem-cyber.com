import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  revokeSessionToken,
  revokeUserSessions,
  validateSessionToken
} from '@/lib/session'
import { verifyRequestOrigin } from '@/lib/security'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const supabase = getSupabaseAdmin()
  const validation = await validateSessionToken(sessionToken, { supabase, touch: false })

  if (!validation.session || !validation.user) {
    const response = NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    if (sessionToken) {
      clearSessionCookie(response)
    }
    return response
  }

  const { data: sessions, error } = await supabase
    .from('user_sessions')
    .select('session_token, created_at, last_activity, expires_at, revoked_at, remember_me, ip_address, user_agent')
    .eq('user_id', validation.session.user_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Session list error:', error)
    return NextResponse.json({ error: 'Не удалось получить список сессий' }, { status: 500 })
  }

  const response = NextResponse.json({
    sessions: (sessions ?? []).map(session => ({
      token: session.session_token,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      revokedAt: session.revoked_at,
      rememberMe: session.remember_me,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      isCurrent: session.session_token === validation.session?.session_token,
    })),
  })

  if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
    attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
  }

  return response
}

export async function DELETE(request: NextRequest) {
  try {
    verifyRequestOrigin(request)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Запрос отклонен' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const supabase = getSupabaseAdmin()
  const validation = await validateSessionToken(currentToken, { supabase, touch: false })

  if (!validation.session || !validation.user) {
    const response = NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    if (currentToken) {
      clearSessionCookie(response)
    }
    return response
  }

  let payload: any = {}
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const targetToken: string | undefined = payload.sessionToken
  const scope: 'current' | 'others' | 'all' = payload.scope ?? (targetToken ? 'current' : 'others')

  if (targetToken) {
    if (targetToken === validation.session.session_token) {
      await revokeSessionToken(targetToken, { supabase })
      const response = NextResponse.json({ success: true, revoked: 'current' })
      clearSessionCookie(response)
      return response
    }

    const { data: targetSession } = await supabase
      .from('user_sessions')
      .select('session_token')
      .eq('session_token', targetToken)
      .eq('user_id', validation.session.user_id)
      .maybeSingle()

    if (!targetSession) {
      return NextResponse.json({ error: 'Сессия не найдена' }, { status: 404 })
    }

    await revokeSessionToken(targetToken, { supabase })
    return NextResponse.json({ success: true, revoked: 'other' })
  }

  if (scope === 'all') {
    await revokeUserSessions(validation.session.user_id, { supabase })
    const response = NextResponse.json({ success: true, revoked: 'all' })
    clearSessionCookie(response)
    return response
  }

  await revokeUserSessions(validation.session.user_id, {
    supabase,
    excludeToken: validation.session.session_token,
  })

  const response = NextResponse.json({ success: true, revoked: 'others' })

  if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
    attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
  }

  return response
}
