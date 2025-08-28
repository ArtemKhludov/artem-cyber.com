import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { id, status, type } = await request.json()

    if (!id || !status || !type) {
      return NextResponse.json(
        { error: 'Неверные параметры' },
        { status: 400 }
      )
    }

    let tableName = ''
    if (type === 'request') {
      tableName = 'callback_requests'
    } else if (type === 'purchase') {
      tableName = 'purchase_requests'
    } else {
      return NextResponse.json(
        { error: 'Неверный тип' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from(tableName)
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: 'Ошибка обновления статуса' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Статус обновлен успешно'
    })

  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
