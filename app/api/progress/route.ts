import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { SessionValidationResult } from '@/lib/session'
import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  getSessionErrorMessage,
  validateSessionToken
} from '@/lib/session'
import { verifyRequestOrigin } from '@/lib/security'

async function getSessionContext() {
  const supabase = getSupabaseAdmin()
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const validation = await validateSessionToken(sessionToken, { supabase })

  return { supabase, sessionToken, validation }
}

function handleUnauthorized(sessionToken: string | undefined, message?: string) {
  const response = NextResponse.json(
    { error: message || getSessionErrorMessage(undefined) },
    { status: 401 }
  )

  if (sessionToken) {
    clearSessionCookie(response)
  }

  return response
}

function applySessionCookie(response: NextResponse, validation: SessionValidationResult) {
  if (validation.session && validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
    attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, sessionToken, validation } = await getSessionContext()

    if (!validation.session || !validation.user) {
      return handleUnauthorized(sessionToken, getSessionErrorMessage(validation.reason))
    }

    const userEmail = validation.user.email
    const courseId = request.nextUrl.searchParams.get('courseId')

    if (courseId) {
      const { data: courseProgress, error: progressError } = await supabase
        .from('course_progress_details')
        .select('*')
        .eq('user_email', userEmail)
        .eq('course_id', courseId)

      if (progressError) {
        console.error('Ошибка получения прогресса курса:', progressError)
        return NextResponse.json({ error: 'Ошибка получения прогресса' }, { status: 500 })
      }

      const { data: courseStats, error: statsError } = await supabase
        .from('course_statistics')
        .select('*')
        .eq('user_email', userEmail)
        .eq('course_id', courseId)
        .single()

      if (statsError) {
        console.error('Ошибка получения статистики курса:', statsError)
      }

      const { data: achievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_email', userEmail)

      if (achievementsError) {
        console.error('Ошибка получения достижений:', achievementsError)
      }

      const response = NextResponse.json({
        courseProgress: courseProgress || [],
        courseStats: courseStats || null,
        achievements: achievements || []
      })

      applySessionCookie(response, validation)
      return response
    }

    const { data: userSummary, error: summaryError } = await supabase
      .from('user_progress_summary')
      .select('*')
      .eq('user_email', userEmail)
      .single()

    if (summaryError) {
      console.error('Ошибка получения сводки пользователя:', summaryError)
      return NextResponse.json({ error: 'Ошибка получения данных' }, { status: 500 })
    }

    const { data: achievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .order('earned_at', { ascending: false })

    if (achievementsError) {
      console.error('Ошибка получения достижений:', achievementsError)
    }

    const { data: allCoursesStats, error: coursesError } = await supabase
      .from('course_statistics')
      .select(`
        *,
        documents (
          id,
          title,
          cover_image_url
        )
      `)
      .eq('user_email', userEmail)
      .order('last_activity_at', { ascending: false })

    if (coursesError) {
      console.error('Ошибка получения статистики курсов:', coursesError)
    }

    const response = NextResponse.json({
      userSummary: userSummary || {
        user_email: userEmail,
        total_points: 0,
        current_level: 1,
        points_to_next_level: 100,
        streak_days: 0,
        courses_started: 0,
        courses_completed: 0,
        total_study_time: 0,
        total_achievements: 0
      },
      achievements: achievements || [],
      coursesStats: allCoursesStats || []
    })

    applySessionCookie(response, validation)
    return response
  } catch (error) {
    console.error('Ошибка API прогресса:', error)
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

    const { supabase, sessionToken, validation } = await getSessionContext()

    if (!validation.session || !validation.user) {
      return handleUnauthorized(sessionToken, getSessionErrorMessage(validation.reason))
    }

    const userEmail = validation.user.email
    const body = await request.json()
    const {
      courseId,
      materialType,
      materialId,
      materialTitle,
      status,
      progressPercentage,
      timeSpent
    } = body

    if (!courseId || !materialType || !materialId || !materialTitle || !status) {
      return NextResponse.json({ error: 'Недостаточно данных для обновления прогресса' }, { status: 400 })
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_email', userEmail)
      .eq('document_id', courseId)
      .eq('payment_status', 'completed')
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Курс не приобретен' }, { status: 403 })
    }

    const progressData = {
      user_email: userEmail,
      course_id: courseId,
      material_type: materialType,
      material_id: materialId,
      material_title: materialTitle,
      status,
      progress_percentage: progressPercentage || 0,
      time_spent: timeSpent || 0,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    }

    const { error: upsertError } = await supabase
      .from('course_progress')
      .upsert(progressData, {
        onConflict: 'user_email,course_id,material_id'
      })

    if (upsertError) {
      console.error('Ошибка обновления прогресса:', upsertError)
      return NextResponse.json({ error: 'Ошибка обновления прогресса' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true })
    applySessionCookie(response, validation)

    return response
  } catch (error) {
    console.error('Ошибка API обновления прогресса:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
