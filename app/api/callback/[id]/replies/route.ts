import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin, requireUser } from '@/lib/auth'
import { notifyUserEmail, notifyUserTelegram } from '@/lib/notify'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const callbackId = resolvedParams.id

        const supabase = getSupabaseAdmin()

        const { data: replies, error } = await supabase
            .from('callback_replies')
            .select(`
        *,
        author:users!callback_replies_author_id_fkey (
          id,
          email,
          name,
          role
        )
      `)
            .eq('callback_request_id', callbackId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Callback replies fetch error:', error)
            return NextResponse.json(
                { error: 'Ошибка получения ответов' },
                { status: 500 }
            )
        }

        return NextResponse.json({ replies })

    } catch (error) {
        console.error('Callback replies API error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const callbackId = resolvedParams.id

        // Проверяем, кто отправляет ответ (админ или пользователь)
        const authHeader = request.headers.get('authorization')
        const isAdmin = authHeader?.startsWith('Bearer ')

        let validation
        if (isAdmin) {
            const result = await requireAdmin(request)
            if (!result.validation) return result.response!
            validation = result.validation
        } else {
            const result = await requireUser(request)
            if (!result.validation) return result.response!
            validation = result.validation
        }

        const body = await request.json()
        const { message, is_internal = false } = body

        if (!message || message.trim().length === 0) {
            return NextResponse.json(
                { error: 'Сообщение не может быть пустым' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Получаем информацию о заявке
        const { data: callbackRequest, error: callbackError } = await supabase
            .from('callback_requests')
            .select(`
        *,
        users!callback_requests_user_id_fkey (
          id,
          email,
          name,
          phone,
          notify_email_enabled,
          notify_telegram_enabled,
          telegram_chat_id
        )
      `)
            .eq('id', callbackId)
            .single()

        if (callbackError || !callbackRequest) {
            return NextResponse.json(
                { error: 'Заявка не найдена' },
                { status: 404 }
            )
        }

        // Определяем тип автора
        const authorType = validation.user.role === 'admin' ? 'admin' : 'user'
        const authorEmail = validation.user.email

        // Создаем ответ
        const { data: reply, error: replyError } = await supabase
            .from('callback_replies')
            .insert([
                {
                    callback_request_id: callbackId,
                    author_id: validation.user.id,
                    author_email: authorEmail,
                    author_type: authorType,
                    message: message.trim(),
                    is_internal
                }
            ])
            .select()
            .single()

        if (replyError) {
            console.error('Callback reply insert error:', replyError)
            return NextResponse.json(
                { error: 'Ошибка сохранения ответа' },
                { status: 500 }
            )
        }

        // Обновляем статус заявки
        let newStatus = callbackRequest.status
        if (authorType === 'admin' && callbackRequest.status === 'new') {
            newStatus = 'in_progress'
        } else if (authorType === 'user' && callbackRequest.status === 'in_progress') {
            newStatus = 'waiting_admin'
        }

        if (newStatus !== callbackRequest.status) {
            await supabase
                .from('callback_requests')
                .update({
                    status: newStatus,
                    last_contacted_at: new Date().toISOString()
                })
                .eq('id', callbackId)
        }

        // Отправляем уведомления
        if (!is_internal && callbackRequest.users) {
            const user = callbackRequest.users

            // Уведомление по email
            if (user.notify_email_enabled && authorType === 'admin') {
                const emailSubject = `Ответ на вашу заявку: ${callbackRequest.product_name || 'Заявка на звонок'}`
                const emailMessage = `Здравствуйте, ${user.name}!

${message}

С уважением,
Команда EnergyLogic`

                notifyUserEmail({
                    to: user.email,
                    subject: emailSubject,
                    html: emailMessage.replace(/\n/g, '<br>'),
                    text: emailMessage
                }).catch((e) =>
                    console.error('Callback reply email error:', e)
                )

                // Записываем уведомление
                await supabase
                    .from('callback_notifications')
                    .insert({
                        callback_request_id: callbackId,
                        user_id: user.id,
                        notification_type: 'new_reply',
                        channel: 'email',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        metadata: {
                            reply_id: reply.id,
                            author_type: authorType
                        }
                    })
            }

            // Уведомление в Telegram
            if (user.notify_telegram_enabled && user.telegram_chat_id && authorType === 'admin') {
                const telegramMessage = `💬 <b>Новый ответ на вашу заявку</b>\n\n` +
                    `${message}\n\n` +
                    `📞 <b>Ваша заявка:</b> ${callbackRequest.product_name || 'Заявка на звонок'}\n` +
                    `📅 <b>Дата:</b> ${new Date().toLocaleString('ru-RU')}\n\n` +
                    `💡 <i>Для ответа используйте личный кабинет</i>`

                notifyUserTelegram(user.telegram_chat_id, telegramMessage).catch((e) =>
                    console.error('Callback reply telegram error:', e)
                )

                // Записываем уведомление
                await supabase
                    .from('callback_notifications')
                    .insert({
                        callback_request_id: callbackId,
                        user_id: user.id,
                        notification_type: 'new_reply',
                        channel: 'telegram',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        metadata: {
                            reply_id: reply.id,
                            author_type: authorType
                        }
                    })
            }
        }

        // Создаем запись в audit_logs
        await supabase
            .from('audit_logs')
            .insert({
                actor_id: validation.user.id,
                actor_email: validation.user.email,
                action: 'callback_reply_created',
                target_table: 'callback_replies',
                target_id: reply.id,
                metadata: {
                    callback_request_id: callbackId,
                    author_type: authorType,
                    is_internal,
                    message_length: message.length
                },
                ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
                user_agent: request.headers.get('user-agent') ?? null
            })

        return NextResponse.json({
            success: true,
            reply,
            status_updated: newStatus !== callbackRequest.status,
            new_status: newStatus
        })

    } catch (error) {
        console.error('Callback replies POST error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
