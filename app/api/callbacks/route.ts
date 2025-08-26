import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('callback_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Фильтрация по статусу
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Пагинация
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Ошибка получения заявок' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, admin_notes } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID заявки обязателен' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    
    if (status) {
      updateData.status = status
      if (status === 'contacted') {
        updateData.contacted_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { data, error } = await supabase
      .from('callback_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Ошибка обновления заявки' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
