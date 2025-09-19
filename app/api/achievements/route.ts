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
import { verifyRequestOrigin } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const validation = await validateSessionToken(sessionToken, { supabase })

    if (!validation.session || !validation.user) {
      const response = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })

      if (sessionToken) {
        clearSessionCookie(response)
      }

      return response
    }

    const userEmail = validation.user.email
    const includeRead = request.nextUrl.searchParams.get('includeRead') === 'true'

    let query = supabase
      .from('user_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .order('earned_at', { ascending: false })

    if (!includeRead) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('earned_at', yesterday)
    }

    const { data: achievements, error: achievementsError } = await query

    if (achievementsError) {
      console.error('Ошибка получения достижений:', achievementsError)
      return NextResponse.json({ error: 'Ошибка получения достижений' }, { status: 500 })
    }

    const { data: notifications, error: notificationsError } = await supabase
      .from('achievement_notifications')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (notificationsError) {
      console.error('Ошибка получения уведомлений о достижениях:', notificationsError)
    }

    const response = NextResponse.json({
      achievements: achievements || [],
      notifications: notifications || []
    })

    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }

    return response
  } catch (error) {
    console.error('Ошибка API достижений:', error)
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

    const supabase = getSupabaseAdmin()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const validation = await validateSessionToken(sessionToken, { supabase })

    if (!validation.session || !validation.user) {
      const response = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })

      if (sessionToken) {
        clearSessionCookie(response)
      }

      return response
    }

    const userEmail = validation.user.email
    const { action, notificationIds } = await request.json()

    if (action === 'markAsRead') {
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return NextResponse.json({ error: 'Неверные данные для отметки как прочитанные' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('achievement_notifications')
        .update({ is_read: true })
        .eq('user_email', userEmail)
        .in('id', notificationIds)

      if (updateError) {
        console.error('Ошибка обновления уведомлений:', updateError)
        return NextResponse.json({ error: 'Ошибка обновления уведомлений' }, { status: 500 })
      }

      const response = NextResponse.json({ success: true })

      if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
        attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
      }

      return response
    }

    if (action === 'markAllAsRead') {
      const { error: updateError } = await supabase
        .from('achievement_notifications')
        .update({ is_read: true })
        .eq('user_email', userEmail)
        .eq('is_read', false)

      if (updateError) {
        console.error('Ошибка обновления всех уведомлений:', updateError)
        return NextResponse.json({ error: 'Ошибка обновления уведомлений' }, { status: 500 })
      }

      const response = NextResponse.json({ success: true })

      if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
        attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
      }

      return response
    }

    return NextResponse.json({ error: 'Неверное действие' }, { status: 400 })
  } catch (error) {
    console.error('Ошибка API обновления достижений:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
