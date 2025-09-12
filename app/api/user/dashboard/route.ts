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
          course_type
        )
      `)
      .eq('user_email', user.email)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })

    if (purchasesError) {
      console.error('Ошибка получения покупок:', purchasesError)
    }

    // Получаем состав курсов из course_composition
    const courseIds = purchases?.map(p => p.document_id) || []
    let courseComposition: Record<string, any> = {}
    let courseWorkbooks: Record<string, any[]> = {}

    if (courseIds.length > 0) {
      const { data: composition, error: compositionError } = await supabase
        .from('course_composition')
        .select('*')
        .in('course_id', courseIds)

      if (!compositionError && composition) {
        courseComposition = composition.reduce((acc, comp) => {
          acc[comp.course_id] = comp
          return acc
        }, {})
      }

      // Получаем рабочие тетради из course_workbooks
      const { data: workbooks, error: workbooksError } = await supabase
        .from('course_workbooks')
        .select('*')
        .in('document_id', courseIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (!workbooksError && workbooks) {
        courseWorkbooks = workbooks.reduce((acc, workbook) => {
          if (!acc[workbook.document_id]) {
            acc[workbook.document_id] = []
          }
          acc[workbook.document_id].push(workbook)
          return acc
        }, {})
      }
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
    const formattedPurchases = purchases?.map(purchase => {
      const composition = courseComposition[purchase.document_id] || {}
      const workbooks = courseWorkbooks[purchase.document_id] || []

      return {
        id: purchase.id,
        product_name: (purchase.documents as any)?.title || 'Курс',
        product_type: (purchase.documents as any)?.course_type === 'mini_course' ? 'mini_course' : 'pdf',
        price: purchase.amount_paid,
        status: purchase.payment_status === 'completed' ? 'completed' : 'pending',
        created_at: purchase.created_at,
        document: {
          ...purchase.documents,
          has_workbook: workbooks.length > 0,
          has_videos: (composition.video_count || 0) > 0,
          has_audio: (composition.audio_count || 0) > 0,
          video_count: composition.video_count || 0,
          workbook_count: workbooks.length,
          workbooks: workbooks.map(wb => ({
            id: wb.id,
            title: wb.title,
            description: wb.description,
            file_url: wb.file_url,
            video_url: wb.video_url,
            order_index: wb.order_index
          })),
          course_duration_minutes: composition.total_items ? composition.total_items * 10 : 30 // Примерная длительность
        },
        progress: 0 // Пока не реализовано отслеживание прогресса
      }
    }) || []

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
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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
