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
                { error: 'Failed to fetch replies' },
                { status: 500 }
            )
        }

        return NextResponse.json({ replies })

    } catch (error) {
        console.error('Callback replies API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
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

        // Determine who is sending reply (admin or user)
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
                { error: 'Message cannot be empty' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Get callback request info
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
                { error: 'Request not found' },
                { status: 404 }
            )
        }

        // Determine author type
        const authorType = validation.user.role === 'admin' ? 'admin' : 'user'
        const authorEmail = validation.user.email

        // Create reply
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
                { error: 'Failed to save reply' },
                { status: 500 }
            )
        }

        // Update request status
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

        // Send notifications
        if (!is_internal && callbackRequest.users) {
            const user = callbackRequest.users

            // Email notification
            if (user.notify_email_enabled && authorType === 'admin') {
                const emailSubject = `Reply to your request: ${callbackRequest.product_name || 'Call request'}`
                const emailMessage = `Hello ${user.name},

${message}

Regards,
EnergyLogic Team`

                notifyUserEmail({
                    to: user.email,
                    subject: emailSubject,
                    html: emailMessage.replace(/\n/g, '<br>'),
                    text: emailMessage
                }).catch((e) =>
                    console.error('Callback reply email error:', e)
                )

                // Log notification
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

            // Telegram notification
            if (user.notify_telegram_enabled && user.telegram_chat_id && authorType === 'admin') {
                const telegramMessage = `💬 <b>New reply to your request</b>\n\n` +
                    `${message}\n\n` +
                    `📞 <b>Your request:</b> ${callbackRequest.product_name || 'Call request'}\n` +
                    `📅 <b>Date:</b> ${new Date().toLocaleString('en-US')}\n\n` +
                    `💡 <i>Please reply via your dashboard</i>`

                notifyUserTelegram(user.telegram_chat_id, telegramMessage).catch((e) =>
                    console.error('Callback reply telegram error:', e)
                )

                // Log notification
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
