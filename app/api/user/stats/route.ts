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

    const { data: userSummary, error: summaryError } = await supabase
      .from('user_progress_summary')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle()

    if (summaryError) {
      console.error('Ошибка получения сводки пользователя:', summaryError)
      return NextResponse.json({ error: 'Ошибка получения статистики' }, { status: 500 })
    }

    const { data: coursesStats, error: coursesError } = await supabase
      .from('course_statistics')
      .select(`
        *,
        documents (
          id,
          title,
          cover_image_url,
          price
        )
      `)
      .eq('user_email', userEmail)
      .order('last_activity_at', { ascending: false })

    if (coursesError) {
      console.error('Ошибка получения статистики курсов:', coursesError)
    }

    const { data: recentAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .order('earned_at', { ascending: false })
      .limit(5)

    if (achievementsError) {
      console.error('Ошибка получения достижений:', achievementsError)
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentActivity, error: activityError } = await supabase
      .from('course_progress')
      .select(`
        *,
        documents (
          title
        )
      `)
      .eq('user_email', userEmail)
      .gte('updated_at', sevenDaysAgo)
      .order('updated_at', { ascending: false })

    if (activityError) {
      console.error('Ошибка получения активности:', activityError)
    }

    const totalStudyHours = userSummary ? Math.round((userSummary.total_study_time / 3600) * 100) / 100 : 0
    const averageCourseCompletion = userSummary && userSummary.courses_started > 0
      ? Math.round((userSummary.courses_completed / userSummary.courses_started) * 100)
      : 0

    const weeklyActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayActivity = recentActivity?.filter(activity =>
        activity.updated_at.startsWith(dateStr)
      ) || []

      weeklyActivity.push({
        date: dateStr,
        day: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        activities: dayActivity.length,
        timeSpent: dayActivity.reduce((sum, activity) => sum + (activity.time_spent || 0), 0)
      })
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
      coursesStats: coursesStats || [],
      recentAchievements: recentAchievements || [],
      recentActivity: recentActivity || [],
      analytics: {
        totalStudyHours,
        averageCourseCompletion,
        weeklyActivity
      }
    })

    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }

    return response
  } catch (error) {
    console.error('Ошибка API статистики пользователя:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
