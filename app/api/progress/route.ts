import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Получение прогресса пользователя
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
    const courseId = request.nextUrl.searchParams.get('courseId')

    if (courseId) {
      // Получаем прогресс конкретного курса
      const { data: courseProgress, error: progressError } = await supabase
        .from('course_progress_details')
        .select('*')
        .eq('user_email', userEmail)
        .eq('course_id', courseId)

      if (progressError) {
        console.error('Ошибка получения прогресса курса:', progressError)
        return NextResponse.json({ error: 'Ошибка получения прогресса' }, { status: 500 })
      }

      // Получаем статистику курса
      const { data: courseStats, error: statsError } = await supabase
        .from('course_statistics')
        .select('*')
        .eq('user_email', userEmail)
        .eq('course_id', courseId)
        .single()

      // Получаем достижения пользователя
      const { data: achievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_email', userEmail)

      return NextResponse.json({
        courseProgress: courseProgress || [],
        courseStats: courseStats || null,
        achievements: achievements || []
      })
    } else {
      // Получаем общий прогресс пользователя
      const { data: userSummary, error: summaryError } = await supabase
        .from('user_progress_summary')
        .select('*')
        .eq('user_email', userEmail)
        .single()

      if (summaryError) {
        console.error('Ошибка получения сводки пользователя:', summaryError)
        return NextResponse.json({ error: 'Ошибка получения данных' }, { status: 500 })
      }

      // Получаем все достижения пользователя
      const { data: achievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_email', userEmail)
        .order('earned_at', { ascending: false })

      // Получаем статистику по всем курсам
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
        achievements: achievements || [],
        coursesStats: allCoursesStats || []
      })
    }

  } catch (error) {
    console.error('Ошибка API прогресса:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// Обновление прогресса
export async function POST(request: NextRequest) {
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

    // Валидация данных
    if (!courseId || !materialType || !materialId || !materialTitle || !status) {
      return NextResponse.json({ error: 'Недостаточно данных для обновления прогресса' }, { status: 400 })
    }

    // Проверяем, есть ли у пользователя доступ к курсу
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

    // Обновляем или создаем запись прогресса
    const progressData = {
      user_email: userEmail,
      course_id: courseId,
      material_type: materialType,
      material_id: materialId,
      material_title: materialTitle,
      status: status,
      progress_percentage: progressPercentage || 0,
      time_spent: timeSpent || 0,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    }

    const { data: progress, error: progressError } = await supabase
      .from('course_progress')
      .upsert(progressData, { 
        onConflict: 'user_email,course_id,material_type,material_id' 
      })
      .select()
      .single()

    if (progressError) {
      console.error('Ошибка обновления прогресса:', progressError)
      return NextResponse.json({ error: 'Ошибка сохранения прогресса' }, { status: 500 })
    }

    // Получаем обновленную статистику
    const { data: updatedStats, error: statsError } = await supabase
      .from('course_statistics')
      .select('*')
      .eq('user_email', userEmail)
      .eq('course_id', courseId)
      .single()

    // Получаем обновленные баллы пользователя
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_email', userEmail)
      .single()

    // Проверяем, есть ли новые достижения
    const { data: newAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .gte('earned_at', new Date(Date.now() - 5000).toISOString()) // За последние 5 секунд

    return NextResponse.json({
      success: true,
      progress,
      stats: updatedStats,
      userPoints,
      newAchievements: newAchievements || []
    })

  } catch (error) {
    console.error('Ошибка API обновления прогресса:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
