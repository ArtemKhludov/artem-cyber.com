import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  getSessionErrorMessage,
  validateSessionToken
} from '@/lib/session'
import { ensureCourseAccessForUser } from '@/lib/course-access'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Получаем токен сессии из cookies
    const supabase = getSupabaseAdmin()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const validation = await validateSessionToken(sessionToken, { supabase })

    if (!validation.session || !validation.user) {
      const response = NextResponse.json(
        { error: getSessionErrorMessage(validation.reason) },
        { status: 401 }
      )

      if (sessionToken) {
        clearSessionCookie(response)
      }

      return response
    }

    const user = validation.user

    // Проверяем, существует ли курс
    const { data: course, error: courseError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Курс не найден' },
        { status: 404 }
      )
    }

    const userId = validation.session.user_id

    // Проверяем доступ через таблицу user_course_access
    let { data: courseAccess } = await supabase
      .from('user_course_access')
      .select('id, expires_at, revoked_at, granted_at')
      .eq('user_id', userId)
      .eq('document_id', id)
      .is('revoked_at', null)
      .maybeSingle()

    const now = new Date()

    if (!courseAccess || (courseAccess.expires_at && new Date(courseAccess.expires_at) <= now)) {
      // Если доступа нет — пробуем восстановить его из завершенных покупок
      try {
        await ensureCourseAccessForUser(supabase, userId, id)
      } catch (ensureError) {
        console.error('ensureCourseAccessForUser failed', {
          userId,
          documentId: id,
          error: ensureError
        })
      }

      const refreshed = await supabase
        .from('user_course_access')
        .select('id, expires_at, revoked_at, granted_at')
        .eq('user_id', userId)
        .eq('document_id', id)
        .is('revoked_at', null)
        .maybeSingle()

      courseAccess = refreshed.data ?? null

      if (!courseAccess || (courseAccess.expires_at && new Date(courseAccess.expires_at) <= now)) {
        let purchaseQuery = supabase
          .from('purchases')
          .select('id, created_at')
          .eq('document_id', id)
          .eq('payment_status', 'completed')

        if (user.email) {
          purchaseQuery = purchaseQuery.or(`user_id.eq.${userId},user_email.eq.${user.email.toLowerCase()}`)
        } else {
          purchaseQuery = purchaseQuery.eq('user_id', userId)
        }

        const { data: fallbackPurchase } = await purchaseQuery
          .order('created_at', { ascending: false })
          .maybeSingle()

        if (fallbackPurchase) {
          courseAccess = {
            id: fallbackPurchase.id,
            granted_at: fallbackPurchase.created_at,
            expires_at: null,
            revoked_at: null
          }
        } else {
          return NextResponse.json(
            { error: 'Курс не приобретен' },
            { status: 403 }
          )
        }
      }
    }

    // Получаем данные о материалах курса (допускаем отсутствие таблиц)
    const documentIds = [id]

    let workbooks: any[] | null = null
    try {
      const { data } = await supabase
        .from('course_workbooks')
        .select('*')
        .in('document_id', documentIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
      workbooks = data || []
    } catch {
      workbooks = []
    }

    let videos: any[] | null = null
    try {
      const { data } = await supabase
        .from('course_videos')
        .select('*')
        .in('document_id', documentIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
      videos = data || []
    } catch {
      videos = []
    }

    let audio: any[] | null = null
    try {
      const { data } = await supabase
        .from('course_audio')
        .select('*')
        .in('document_id', documentIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })
      audio = data || []
    } catch {
      audio = []
    }

    // Формируем ответ с данными курса
    const courseData = {
      ...course,
      workbooks: workbooks || [],
      videos: videos || [],
      audio: audio || [],
      workbook_count: workbooks?.length || 0,
      video_count: videos?.length || 0,
      audio_count: audio?.length || 0,
      has_workbook: (workbooks?.length || 0) > 0,
      has_videos: (videos?.length || 0) > 0,
      has_audio: (audio?.length || 0) > 0,
      purchase_date: courseAccess?.granted_at ?? course.created_at
    }

    const response = NextResponse.json({
      success: true,
      course: courseData,
      user: {
        email: user.email,
        role: user.role
      }
    })

    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }

    return response

  } catch (error) {
    console.error('Course access API error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
