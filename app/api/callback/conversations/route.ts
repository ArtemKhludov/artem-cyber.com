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
                { error: 'Request ID is required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const user = validation.user

        // Get conversation via function
        const { data: conversations, error } = await supabase
            .rpc('get_callback_conversation', {
                request_uuid: callbackRequestId,
                user_uuid: user.id
            })

        if (error) {
            console.error('Error fetching conversations:', error)
            return NextResponse.json(
                { error: 'Error fetching conversation' },
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
            { error: 'Internal server error' },
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
                { error: 'Request ID and message are required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const user = validation.user

        // Check that user has access to this request
        const { data: callbackRequest, error: checkError } = await supabase
            .from('callback_requests')
            .select('id, user_id')
            .eq('id', callback_request_id)
            .single()

        if (checkError || !callbackRequest) {
            return NextResponse.json(
                { error: 'Request not found' },
                { status: 404 }
            )
        }

        // Check access rights
        const isAdmin = user.role === 'admin'
        const isOwner = callbackRequest.user_id === user.id

        if (!isAdmin && !isOwner) {
            return NextResponse.json(
                { error: 'No access to this request' },
                { status: 403 }
            )
        }

        // Create message
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
                { error: 'Error creating message' },
                { status: 500 }
            )
        }

        // Create notification for recipient
        const notificationData = {
            callback_request_id,
            user_id: isAdmin ? callbackRequest.user_id : null,
            notification_type: isAdmin ? 'new_reply' : 'user_message',
            channel: 'email',
            status: 'pending',
            metadata: {
                reply_message: message.trim(),
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
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
