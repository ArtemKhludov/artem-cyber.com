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

    // Получаем покупки пользователя из таблицы purchases (связанные с документами)
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        document_id,
        payment_method,
        payment_status,
        amount_paid,
        currency,
        created_at,
        updated_at,
        documents (
          id,
          title,
          description,
          price_rub,
          cover_url,
          course_type,
          has_workbook,
          has_videos,
          has_audio,
          video_count,
          workbook_count,
          course_duration_minutes
        )
      `)
      .eq('user_email', user.email)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })

    if (purchasesError) {
      console.error('Ошибка получения покупок:', purchasesError)
    }

    // Получаем заказы пользователя (для совместимости со старой системой)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        amount,
        status,
        pdf_url,
        session_date,
        session_time,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Ошибка получения заказов:', ordersError)
    }

    // Получаем статистику
    const totalPurchases = purchases?.length || 0
    const totalOrders = orders?.length || 0
    const completedOrders = orders?.filter(o => o.status === 'completed').length || 0
    const totalSpent = (purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0) +
      (orders?.reduce((sum, o) => sum + o.amount, 0) || 0)

    // Форматируем данные для фронтенда
    const formattedPurchases = purchases?.map(purchase => ({
      id: purchase.id,
      product_name: purchase.documents?.title || 'Курс',
      product_type: purchase.documents?.course_type === 'mini_course' ? 'mini_course' : 'pdf',
      price: purchase.amount_paid,
      status: purchase.payment_status === 'completed' ? 'completed' : 'pending',
      created_at: purchase.created_at,
      document: purchase.documents,
      progress: 0 // Пока не реализовано отслеживание прогресса
    })) || []

    const formattedOrders = orders?.map(order => ({
      id: order.id,
      product_name: 'Энергетическая диагностика',
      product_type: 'session',
      price: order.amount,
      status: order.status === 'completed' ? 'completed' : 'pending',
      created_at: order.created_at,
      pdf_url: order.pdf_url,
      session_date: order.session_date,
      session_time: order.session_time,
      progress: order.status === 'completed' ? 100 : 0
    })) || []

    // Объединяем покупки и заказы
    const allPurchases = [...formattedPurchases, ...formattedOrders]

    return NextResponse.json({
      user,
      purchases: allPurchases,
      courses: formattedPurchases, // Курсы - это только покупки документов
      orders: formattedOrders, // Заказы - это сессии диагностики
      stats: {
        totalPurchases: totalPurchases + totalOrders,
        totalCourses: totalPurchases,
        completedCourses: completedOrders,
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
