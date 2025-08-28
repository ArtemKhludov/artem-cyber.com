import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'requests'

    if (type === 'requests') {
      const { data, error } = await supabase
        .from('callback_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching requests:', error)
        return NextResponse.json(
          { error: 'Ошибка загрузки заявок' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else if (type === 'purchases') {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching purchases:', error)
        return NextResponse.json(
          { error: 'Ошибка загрузки покупок' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else if (type === 'documents') {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('title', { ascending: true })

      if (error) {
        console.error('Error fetching documents:', error)
        return NextResponse.json(
          { error: 'Ошибка загрузки документов' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    }

    return NextResponse.json(
      { error: 'Неверный тип данных' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin data error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
