import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Проверяем подключение к базе
    const { data, error } = await supabase
      .from('purchase_requests')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Ошибка подключения к базе', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Подключение к базе работает',
      data
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error },
      { status: 500 }
    )
  }
}
