import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Получение достижений пользователя
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
    const includeRead = request.nextUrl.searchParams.get('includeRead') === 'true'

    // Получаем достижения пользователя
    let query = supabase
      .from('user_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .order('earned_at', { ascending: false })

    if (!includeRead) {
      // Получаем только новые достижения (за последние 24 часа)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('earned_at', yesterday)
    }

    const { data: achievements, error: achievementsError } = await query

    if (achievementsError) {
      console.error('Ошибка получения достижений:', achievementsError)
      return NextResponse.json({ error: 'Ошибка получения достижений' }, { status: 500 })
    }

    // Получаем уведомления о достижениях
    const { data: notifications, error: notificationsError } = await supabase
      .from('achievement_notifications')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      achievements: achievements || [],
      notifications: notifications || []
    })

  } catch (error) {
    console.error('Ошибка API достижений:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// Отметка уведомлений как прочитанных
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
    const { action, notificationIds } = body

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

      return NextResponse.json({ success: true })
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

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Неверное действие' }, { status: 400 })

  } catch (error) {
    console.error('Ошибка API обновления достижений:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
