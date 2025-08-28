import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Проверяем заявки в базе
    const { data: requests, error: requestsError } = await supabase
      .from('callback_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('Requests error:', requestsError)
      return NextResponse.json(
        { error: 'Ошибка загрузки заявок', details: requestsError },
        { status: 500 }
      )
    }

    // Проверяем покупки в базе
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchase_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (purchasesError) {
      console.error('Purchases error:', purchasesError)
      return NextResponse.json(
        { error: 'Ошибка загрузки покупок', details: purchasesError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requests: requests || [],
      purchases: purchases || [],
      requestsCount: requests?.length || 0,
      purchasesCount: purchases?.length || 0
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error },
      { status: 500 }
    )
  }
}
