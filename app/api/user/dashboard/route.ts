import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Проверяем сессию
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Недействительная сессия' }, { status: 401 })
    }

    // Получаем данные пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('id', session.user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Получаем покупки пользователя
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        product_name,
        product_type,
        price,
        status,
        created_at,
        progress
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (purchasesError) {
      console.error('Ошибка получения покупок:', purchasesError)
    }

    // Получаем курсы пользователя
    const { data: courses, error: coursesError } = await supabase
      .from('user_courses')
      .select(`
        id,
        course_id,
        progress,
        status,
        created_at,
        courses (
          id,
          title,
          description,
          total_lessons,
          duration,
          difficulty,
          thumbnail
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (coursesError) {
      console.error('Ошибка получения курсов:', coursesError)
    }

    // Получаем статистику
    const totalPurchases = purchases?.length || 0
    const totalCourses = courses?.length || 0
    const completedCourses = courses?.filter(c => c.status === 'completed').length || 0
    const totalSpent = purchases?.reduce((sum, p) => sum + p.price, 0) || 0

    return NextResponse.json({
      user,
      purchases: purchases || [],
      courses: courses || [],
      stats: {
        totalPurchases,
        totalCourses,
        completedCourses,
        totalSpent
      }
    })

  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
