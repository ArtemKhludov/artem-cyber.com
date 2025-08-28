import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { id, field, value, type } = await request.json()

    if (!id || field === undefined || !type) {
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

    const updateData: any = {}
    updateData[field] = value

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Update field error:', error)
      return NextResponse.json(
        { error: 'Ошибка обновления поля' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Поле обновлено успешно'
    })

  } catch (error) {
    console.error('Update field error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
