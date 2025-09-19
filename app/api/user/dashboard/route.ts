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

type AccessRow = {
  id: string
  document_id: string | null
  granted_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

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

    const user = validation.user

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

    const courseIds = purchases?.map(p => p.document_id) || []
    let courseComposition: Record<string, any> = {}
    let courseWorkbooks: Record<string, any[]> = {}

    if (courseIds.length > 0) {
      const { data: composition, error: compositionError } = await supabase
        .from('course_composition')
        .select('*')
        .in('course_id', courseIds)

      if (!compositionError && composition) {
        courseComposition = composition.reduce((acc: Record<string, any>, comp: any) => {
          acc[comp.course_id] = comp
          return acc
        }, {})
      }

      const { data: workbooks, error: workbooksError } = await supabase
        .from('course_workbooks')
        .select('*')
        .in('document_id', courseIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (!workbooksError && workbooks) {
        courseWorkbooks = workbooks.reduce((acc: Record<string, any[]>, workbook: any) => {
          if (!acc[workbook.document_id]) {
            acc[workbook.document_id] = []
          }
          acc[workbook.document_id].push(workbook)
          return acc
        }, {})
      }
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, amount, status, pdf_url, session_date, session_time, created_at, updated_at')
      .eq('user_id', validation.session.user_id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Ошибка получения заказов:', ordersError)
    }

    const { data: rawAccesses, error: accessesError } = await supabase
      .from('user_course_access')
      .select('id, document_id, granted_at, expires_at, revoked_at')
      .eq('user_id', validation.session.user_id)

    if (accessesError) {
      console.error('Ошибка получения доступов:', accessesError)
    }

    const accessByDocument = (rawAccesses || []).reduce<Record<string, AccessRow>>((acc, access) => {
      if (access.document_id) {
        acc[access.document_id] = access as AccessRow
      }
      return acc
    }, {})

    const totalPurchases = purchases?.length || 0
    const totalOrders = orders?.length || 0
    const completedOrders = orders?.filter(o => o.status === 'completed').length || 0
    const totalSpent = (purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0) +
      (orders?.reduce((sum, o) => sum + o.amount, 0) || 0)

    const formattedPurchases = purchases?.map(purchase => {
      const composition = courseComposition[purchase.document_id] || {}
      const access = purchase.document_id ? accessByDocument[purchase.document_id] : null
      let accessStatus: 'active' | 'revoked' | 'expired' | 'pending' | undefined

      if (access) {
        if (access.revoked_at) {
          accessStatus = 'revoked'
        } else if (access.expires_at && new Date(access.expires_at) < new Date()) {
          accessStatus = 'expired'
        } else {
          accessStatus = 'active'
        }
      }

      const workbooks = courseWorkbooks[purchase.document_id] || []
      const document = purchase.documents as any

      return {
        id: purchase.id,
        product_name: document?.title || 'Курс',
        product_type: document?.course_type === 'mini_course' ? 'mini_course' : 'pdf',
        price: purchase.amount_paid,
        status: accessStatus ?? (purchase.payment_status === 'completed' ? 'completed' : 'pending'),
        payment_status: purchase.payment_status,
        created_at: purchase.created_at,
        receipt_url: (purchase as any)?.receipt_url ?? null,
        access: access
          ? {
              id: access.id,
              status: accessStatus ?? 'pending',
              granted_at: access.granted_at,
              expires_at: access.expires_at,
              revoked_at: access.revoked_at
            }
          : null,
        document: {
          ...document,
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
          course_duration_minutes: composition.total_items ? composition.total_items * 10 : 30
        },
        progress: 0
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
      receipt_url: order.pdf_url,
      session_date: order.session_date,
      session_time: order.session_time,
      progress: order.status === 'completed' ? 100 : 0
    })) || []

    const allPurchases = [...formattedPurchases, ...formattedOrders]

    const response = NextResponse.json({
      user,
      purchases: allPurchases,
      courses: formattedPurchases,
      orders: formattedOrders,
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

    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }

    return response
  } catch (error) {
    console.error('Ошибка API dashboard пользователя:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
