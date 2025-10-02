import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyCallbackTelegram, notifyUserEmail } from '@/lib/notify'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const priority = searchParams.get('priority')
        const assignedAdmin = searchParams.get('assigned_admin')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        const supabase = getSupabaseAdmin()

        let query = supabase
            .from('callback_requests')
            .select(`
        *,
        users!callback_requests_user_id_fkey (
          id,
          email,
          name,
          phone,
          telegram_username,
          notify_email_enabled,
          notify_telegram_enabled
        ),
        issue_reports!callback_requests_issue_id_fkey (
          id,
          title,
          status,
          created_at
        ),
        callback_replies (
          id,
          message,
          author_type,
          created_at,
          author_email
        ),
        assigned_admin:users!callback_requests_assigned_admin_id_fkey (
          id,
          email,
          name
        )
      `, { count: 'exact' })
            .order('created_at', { ascending: false })

        // Фильтрация
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }
        if (priority && priority !== 'all') {
            query = query.eq('priority', priority)
        }
        if (assignedAdmin && assignedAdmin !== 'all') {
            query = query.eq('assigned_admin_id', assignedAdmin)
        }

        // Пагинация
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) {
            console.error('Enhanced callback fetch error:', error)
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
        console.error('Enhanced callback API error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            name,
            phone,
            email,
            preferred_time,
            message,
            source_page,
            product_type,
            product_name,
            notes,
            priority = 'medium',
            tags = [],
            metadata = {}
        } = body

        // Валидация обязательных полей
        if (!name || !phone) {
            return NextResponse.json(
                { error: 'Имя и телефон обязательны' },
                { status: 400 }
            )
        }

        // Валидация телефона
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                { error: 'Неверный формат телефона' },
                { status: 400 }
            )
        }

        // Валидация email (если предоставлен)
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return NextResponse.json(
                    { error: 'Неверный формат email' },
                    { status: 400 }
                )
            }
        }

        const supabase = getSupabaseAdmin()

        // Сохранение заявки в базу данных
        // Триггер автоматически создаст пользователя и issue_reports
        const { data, error } = await supabase
            .from('callback_requests')
            .insert([
                {
                    name: name.trim(),
                    phone: phone.trim(),
                    email: email?.trim() || null,
                    preferred_time: preferred_time?.trim() || null,
                    message: message?.trim() || null,
                    source_page: source_page || 'unknown',
                    product_type: product_type || 'callback',
                    product_name: product_name || 'Заказ звонка',
                    notes: notes || null,
                    source: 'website',
                    status: 'new',
                    ...(priority && { priority }),
                    ...(tags && tags.length > 0 && { tags }),
                    ...(Object.keys(metadata).length > 0 && { metadata })
                }
            ])
            .select(`
        *,
        users!callback_requests_user_id_fkey (
          id,
          email,
          name,
          phone,
          temp_password
        )
      `)
            .single()

        if (error) {
            console.error('Enhanced callback insert error:', error)
            return NextResponse.json(
                { error: 'Ошибка сохранения заявки', details: error.message },
                { status: 500 }
            )
        }

        // Отправка уведомления в Telegram
        const telegramMessage = `🆕 Новая заявка из CRM-системы:\n` +
            `👤 Имя: ${name}\n` +
            `📧 Email: ${email || 'Не указан'}\n` +
            `📞 Телефон: ${phone}\n` +
            `📦 Тип: ${product_type || 'callback'}\n` +
            `🛍️ Товар/Услуга: ${product_name || 'Заказ звонка'}\n` +
            `📝 Заметки: ${notes || 'Нет'}\n` +
            `🌐 Источник: ${source_page || 'Не указан'}\n` +
            `⚡ Приоритет: ${priority}\n` +
            `🏷️ Теги: ${tags.length > 0 ? tags.join(', ') : 'Нет'}`

        notifyCallbackTelegram(telegramMessage).catch((e) =>
            console.error('Telegram callback notify error:', e)
        )

        // Если пользователь был создан автоматически, отправляем приветственное письмо
        if (data.auto_created_user && data.users?.temp_password) {
            const welcomeMessage = `Добро пожаловать в EnergyLogic!

Ваши данные для входа в личный кабинет:
Email: ${data.users.email}
Временный пароль: ${data.users.temp_password}

Пожалуйста, смените пароль при первом входе.

С уважением,
Команда EnergyLogic`

            notifyUserEmail({
                to: data.users.email,
                subject: 'Добро пожаловать в EnergyLogic!',
                html: welcomeMessage.replace(/\n/g, '<br>'),
                text: welcomeMessage
            }).catch((e) =>
                console.error('Welcome email error:', e)
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Заявка успешно отправлена',
            data: {
                ...data,
                // Не возвращаем временный пароль в ответе
                users: data.users ? {
                    ...data.users,
                    temp_password: undefined
                } : null
            }
        })

    } catch (error) {
        console.error('Enhanced callback server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { validation, response } = await requireAdmin(request)
        if (!validation) return response!

        const body = await request.json()
        const {
            id,
            status,
            priority,
            assigned_admin_id,
            admin_notes,
            tags,
            metadata
        } = body

        if (!id) {
            return NextResponse.json(
                { error: 'ID заявки обязателен' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()
        const updateData: any = {}

        if (status) {
            updateData.status = status
            if (status === 'contacted') {
                updateData.last_contacted_at = new Date().toISOString()
                // Увеличиваем счетчик попыток через отдельный запрос
                const { data: currentCallback } = await supabase
                    .from('callback_requests')
                    .select('contact_attempts')
                    .eq('id', id)
                    .single()

                if (currentCallback) {
                    updateData.contact_attempts = (currentCallback.contact_attempts || 0) + 1
                }
            } else if (status === 'completed') {
                updateData.completed_at = new Date().toISOString()
            }
        }

        if (priority) updateData.priority = priority
        if (assigned_admin_id !== undefined) updateData.assigned_admin_id = assigned_admin_id
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes
        if (tags) updateData.tags = tags
        if (metadata) updateData.metadata = metadata

        const { data, error } = await supabase
            .from('callback_requests')
            .update(updateData)
            .eq('id', id)
            .select(`
        *,
        users!callback_requests_user_id_fkey (
          id,
          email,
          name,
          phone,
          notify_email_enabled,
          notify_telegram_enabled
        )
      `)
            .single()

        if (error) {
            console.error('Enhanced callback update error:', error)
            return NextResponse.json(
                { error: 'Ошибка обновления заявки' },
                { status: 500 }
            )
        }

        // Отправляем уведомление пользователю об изменении статуса
        if (data.users && status) {
            const statusMessages = {
                'contacted': 'Мы связались с вами по вашей заявке',
                'in_progress': 'Ваша заявка находится в обработке',
                'completed': 'Ваша заявка завершена',
                'cancelled': 'Ваша заявка отменена'
            }

            const message = statusMessages[status as keyof typeof statusMessages]
            if (message) {
                // Создаем запись уведомления
                await supabase
                    .from('callback_notifications')
                    .insert({
                        callback_request_id: id,
                        user_id: data.users.id,
                        notification_type: 'status_change',
                        channel: 'email',
                        status: 'pending',
                        metadata: {
                            status,
                            message
                        }
                    })
            }
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Enhanced callback PATCH error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
