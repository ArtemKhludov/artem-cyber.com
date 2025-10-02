import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    validateSessionToken
} from '@/lib/session'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const callbackRequestId = searchParams.get('callback_request_id')
        
        if (!callbackRequestId) {
            return NextResponse.json(
                { error: 'ID обращения обязателен' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return NextResponse.json(
                { error: 'Необходима авторизация' },
                { status: 401 }
            )
        }

        const user = validation.user

        // Получаем переписку через функцию
        const { data: conversations, error } = await supabase
            .rpc('get_callback_conversation', {
                request_uuid: callbackRequestId,
                user_uuid: user.id
            })

        if (error) {
            console.error('Error fetching conversations:', error)
            return NextResponse.json(
                { error: 'Ошибка получения переписки' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: conversations || []
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { callback_request_id, message, message_type = 'text', file_url, file_name } = body

        if (!callback_request_id || !message) {
            return NextResponse.json(
                { error: 'ID обращения и сообщение обязательны' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return NextResponse.json(
                { error: 'Необходима авторизация' },
                { status: 401 }
            )
        }

        const user = validation.user

        // Проверяем, что пользователь имеет доступ к этому обращению
        const { data: callbackRequest, error: checkError } = await supabase
            .from('callback_requests')
            .select('id, user_id')
            .eq('id', callback_request_id)
            .single()

        if (checkError || !callbackRequest) {
            return NextResponse.json(
                { error: 'Обращение не найдено' },
                { status: 404 }
            )
        }

        // Проверяем права доступа
        const isAdmin = user.role === 'admin'
        const isOwner = callbackRequest.user_id === user.id

        if (!isAdmin && !isOwner) {
            return NextResponse.json(
                { error: 'Нет доступа к этому обращению' },
                { status: 403 }
            )
        }

        // Создаем сообщение
        const { data: conversation, error } = await supabase
            .from('callback_conversations')
            .insert([
                {
                    callback_request_id,
                    user_id: callbackRequest.user_id,
                    admin_id: isAdmin ? user.id : null,
                    message: message.trim(),
                    message_type,
                    sender_type: isAdmin ? 'admin' : 'user',
                    file_url,
                    file_name
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('Error creating conversation:', error)
            return NextResponse.json(
                { error: 'Ошибка создания сообщения' },
                { status: 500 }
            )
        }

        // Создаем уведомление для получателя
        const notificationData = {
            callback_request_id,
            user_id: isAdmin ? callbackRequest.user_id : null,
            notification_type: isAdmin ? 'admin_reply' : 'user_message',
            channel: 'email',
            status: 'pending',
            metadata: {
                message: message.trim(),
                sender_name: user.name,
                sender_type: isAdmin ? 'admin' : 'user'
            }
        }

        await supabase
            .from('callback_notifications')
            .insert([notificationData])

        return NextResponse.json({
            success: true,
            data: conversation
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
