// API для ответов администраторов на callback заявки

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message, admin_name } = body

    // Проверяем права администратора
    const validation = await requireAdmin(request)
    if (validation.response) {
      return validation.response
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Сообщение не может быть пустым' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Получаем информацию о заявке
    const { data: callback, error: callbackError } = await supabase
      .from('callback_requests')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single()

    if (callbackError || !callback) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      )
    }

    // Создаем ответ в callback_replies
    const { data: reply, error: replyError } = await supabase
      .from('callback_replies')
      .insert([
        {
          callback_request_id: id,
          admin_id: validation.validation.user.id,
          message: message.trim(),
          is_from_admin: true
        }
      ])
      .select()
      .single()

    if (replyError) {
      console.error('Error creating reply:', replyError)
      return NextResponse.json(
        { error: 'Ошибка создания ответа' },
        { status: 500 }
      )
    }

    // Создаем уведомление для пользователя
    if (callback.users && callback.users.email) {
      await supabase
        .from('callback_notifications')
        .insert([
          {
            callback_request_id: id,
            user_id: callback.user_id,
            notification_type: 'new_reply',
            channel: 'email',
            status: 'pending',
            metadata: {
              admin_name: admin_name || validation.validation.user.name || 'Администратор',
              reply_message: message.trim(),
              reply_id: reply.id
            }
          }
        ])
    }

    // Если у пользователя подключен Telegram, создаем уведомление
    if (callback.users && callback.users.telegram_chat_id) {
      await supabase
        .from('callback_notifications')
        .insert([
          {
            callback_request_id: id,
            user_id: callback.user_id,
            notification_type: 'new_reply',
            channel: 'telegram',
            status: 'pending',
            metadata: {
              admin_name: admin_name || validation.validation.user.name || 'Администратор',
              reply_message: message.trim(),
              reply_id: reply.id
            }
          }
        ])
    }

    // Обновляем статус заявки на "отвечено"
    await supabase
      .from('callback_requests')
      .update({
        status: 'replied',
        last_contacted_at: new Date().toISOString()
      })
      .eq('id', id)

    // Логируем действие
    await supabase
      .from('user_contact_audit')
      .insert([
        {
          user_id: callback.user_id,
          action: 'admin_reply',
          new_value: `Reply ID: ${reply.id}`,
          old_value: null
        }
      ])

    return NextResponse.json({
      success: true,
      data: {
        reply,
        callback: {
          id: callback.id,
          name: callback.name,
          email: callback.email,
          status: 'replied'
        }
      }
    })

  } catch (error) {
    console.error('Error creating admin reply:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET endpoint для получения всех ответов по заявке
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Проверяем права администратора
    const validation = await requireAdmin(request)
    if (validation.response) {
      return validation.response
    }

    const supabase = getSupabaseAdmin()

    // Получаем все ответы по заявке
    const { data: replies, error } = await supabase
      .from('callback_replies')
      .select(`
        *,
        users!callback_replies_user_id_fkey(
          id,
          name,
          email
        ),
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

    return NextResponse.json({
      success: true,
      data: replies || []
    })

  } catch (error) {
    console.error('Error fetching replies:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
