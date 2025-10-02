// API для пользователей для получения ответов на свои заявки

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Проверяем права пользователя
    const validation = await requireUser(request)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Проверяем, что заявка принадлежит пользователю
    const { data: callback, error: callbackError } = await supabase
      .from('callback_requests')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', validation.user.id)
      .single()

    if (callbackError || !callback) {
      return NextResponse.json(
        { error: 'Заявка не найдена или доступ запрещен' },
        { status: 404 }
      )
    }

    // Получаем все ответы по заявке
    const { data: replies, error } = await supabase
      .from('callback_replies')
      .select(`
        *,
        admin:users!callback_replies_admin_id_fkey(
          id,
          name,
          email
        )
      `)
      .eq('callback_request_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching replies:', error)
      return NextResponse.json(
        { error: 'Ошибка получения ответов' },
        { status: 500 }
      )
    }

    // Помечаем ответы как прочитанные
    if (replies && replies.length > 0) {
      const unreadReplies = replies.filter(reply => 
        reply.is_from_admin && !reply.read_by?.includes(validation.user.id)
      )

      if (unreadReplies.length > 0) {
        for (const reply of unreadReplies) {
          await supabase
            .from('callback_replies')
            .update({
              read_by: [...(reply.read_by || []), validation.user.id]
            })
            .eq('id', reply.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: replies || []
    })

  } catch (error) {
    console.error('Error fetching user replies:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST endpoint для ответа пользователя на заявку
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message } = body

    // Проверяем права пользователя
    const validation = await requireUser(request)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 401 }
      )
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Сообщение не может быть пустым' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Проверяем, что заявка принадлежит пользователю
    const { data: callback, error: callbackError } = await supabase
      .from('callback_requests')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('user_id', validation.user.id)
      .single()

    if (callbackError || !callback) {
      return NextResponse.json(
        { error: 'Заявка не найдена или доступ запрещен' },
        { status: 404 }
      )
    }

    // Создаем ответ пользователя
    const { data: reply, error: replyError } = await supabase
      .from('callback_replies')
      .insert([
        {
          callback_request_id: id,
          user_id: validation.user.id,
          message: message.trim(),
          is_from_admin: false
        }
      ])
      .select()
      .single()

    if (replyError) {
      console.error('Error creating user reply:', replyError)
      return NextResponse.json(
        { error: 'Ошибка создания ответа' },
        { status: 500 }
      )
    }

    // Обновляем статус заявки на "ожидает ответа"
    await supabase
      .from('callback_requests')
      .update({ 
        status: 'waiting_response',
        last_contacted_at: new Date().toISOString()
      })
      .eq('id', id)

    // Создаем уведомление для администраторов
    await supabase
      .from('callback_notifications')
      .insert([
        {
          callback_request_id: id,
          user_id: validation.user.id,
          notification_type: 'user_reply',
          channel: 'telegram',
          status: 'pending',
          metadata: {
            user_name: validation.user.name,
            message: message.trim(),
            reply_id: reply.id
          }
        }
      ])

    return NextResponse.json({
      success: true,
      data: reply
    })

  } catch (error) {
    console.error('Error creating user reply:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
