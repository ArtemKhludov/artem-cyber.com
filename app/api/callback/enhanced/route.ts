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

        // Filtering
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }
        if (priority && priority !== 'all') {
            query = query.eq('priority', priority)
        }
        if (assignedAdmin && assignedAdmin !== 'all') {
            query = query.eq('assigned_admin_id', assignedAdmin)
        }

        // Pagination
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) {
            console.error('Enhanced callback fetch error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch requests' },
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
            { error: 'Internal server error' },
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

        // Required fields validation
        if (!name || !phone) {
            return NextResponse.json(
                { error: 'Name and phone are required' },
                { status: 400 }
            )
        }

        // Phone validation
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                { error: 'Invalid phone format' },
                { status: 400 }
            )
        }

        // Email validation (if provided)
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                return NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                )
            }
        }

        const supabase = getSupabaseAdmin()

        // Save request; DB trigger auto-creates user and issue_reports
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
                    product_name: product_name || 'Call request',
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
                { error: 'Failed to save request', details: error.message },
                { status: 500 }
            )
        }

        // Telegram notification
        const telegramMessage = `🆕 New CRM callback request:\n` +
            `👤 Name: ${name}\n` +
            `📧 Email: ${email || 'Not provided'}\n` +
            `📞 Phone: ${phone}\n` +
            `📦 Type: ${product_type || 'callback'}\n` +
            `🛍️ Product/Service: ${product_name || 'Call request'}\n` +
            `📝 Notes: ${notes || 'None'}\n` +
            `🌐 Source: ${source_page || 'Not specified'}\n` +
            `⚡ Priority: ${priority}\n` +
            `🏷️ Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}`

        notifyCallbackTelegram(telegramMessage).catch((e) =>
            console.error('Telegram callback notify error:', e)
        )

        // If user auto-created, send welcome email
        if (data.auto_created_user && data.users?.temp_password) {
            const welcomeMessage = `Welcome to EnergyLogic!

Your login details:
Email: ${data.users.email}
Temporary password: ${data.users.temp_password}

Please change your password on first login.

Regards,
EnergyLogic Team`

            notifyUserEmail({
                to: data.users.email,
                subject: 'Welcome to EnergyLogic!',
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
