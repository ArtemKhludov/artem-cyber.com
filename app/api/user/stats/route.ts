import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Получение статистики пользователя
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Получаем информацию о пользователе из сессии
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        user_id,
        users!inner (
          email,
          name,
          role
        )
      `)
      .eq('session_token', sessionToken)
      .eq('expires_at', '>', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Недействительная сессия' }, { status: 401 })
    }

    const userEmail = (session.users as any).email

    // Получаем сводку пользователя
    const { data: userSummary, error: summaryError } = await supabase
      .from('user_progress_summary')
      .select('*')
      .eq('user_email', userEmail)
      .single()

    if (summaryError) {
      console.error('Ошибка получения сводки пользователя:', summaryError)
      return NextResponse.json({ error: 'Ошибка получения статистики' }, { status: 500 })
    }

    // Получаем статистику по всем курсам
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

    // Получаем последние достижения
    const { data: recentAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .order('earned_at', { ascending: false })
      .limit(5)

    if (achievementsError) {
      console.error('Ошибка получения достижений:', achievementsError)
    }

    // Получаем активность за последние 7 дней
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

    // Вычисляем дополнительную статистику
    const totalStudyHours = userSummary ? Math.round(userSummary.total_study_time / 3600 * 100) / 100 : 0
    const averageCourseCompletion = userSummary && userSummary.courses_started > 0 
      ? Math.round((userSummary.courses_completed / userSummary.courses_started) * 100) 
      : 0

    // Подготавливаем данные для графиков
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

    return NextResponse.json({
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

  } catch (error) {
    console.error('Ошибка API статистики пользователя:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
