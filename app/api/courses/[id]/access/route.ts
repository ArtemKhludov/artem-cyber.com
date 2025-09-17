import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Получаем токен сессии из cookies
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Проверяем сессию пользователя
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        user_id,
        expires_at,
        users (
          id,
          email,
          name,
          role
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Пользователь не авторизован' },
        { status: 401 }
      )
    }

    const user = Array.isArray(session.users) ? session.users[0] : session.users

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

    // Проверяем, купил ли пользователь этот курс
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('document_id', id)
      .eq('user_email', user.email)
      .eq('payment_status', 'completed')
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Курс не приобретен' },
        { status: 403 }
      )
    }

    // Получаем данные о материалах курса
    const documentIds = [id]

    // Получаем рабочие тетради
    const { data: workbooks } = await supabase
      .from('course_workbooks')
      .select('*')
      .in('document_id', documentIds)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    // Получаем видео
    const { data: videos } = await supabase
      .from('course_videos')
      .select('*')
      .in('document_id', documentIds)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    // Получаем аудио
    const { data: audio } = await supabase
      .from('course_audio')
      .select('*')
      .in('document_id', documentIds)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

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
      purchase_date: purchase.created_at
    }

    return NextResponse.json({
      success: true,
      course: courseData,
      user: {
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Course access API error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
