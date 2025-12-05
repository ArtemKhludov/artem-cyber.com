// API for users to get replies to their requests

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check user permissions
    const validation = await requireUser(request)
    if (validation.response) {
      return validation.response
    }

    const supabase = getSupabaseAdmin()

    // Check that request belongs to user
    const { data: callback, error: callbackError } = await supabase
      .from('callback_requests')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', validation.validation.user.id)
      .single()

    if (callbackError || !callback) {
      return NextResponse.json(
        { error: 'Request not found or access denied' },
        { status: 404 }
      )
    }

    // Get all replies for the request
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
        { error: 'Failed to fetch replies' },
        { status: 500 }
      )
    }

    // Mark replies as read
    if (replies && replies.length > 0) {
      const unreadReplies = replies.filter(reply => 
        reply.is_from_admin && !reply.read_by?.includes(validation.validation.user.id)
      )

      if (unreadReplies.length > 0) {
        for (const reply of unreadReplies) {
          await supabase
            .from('callback_replies')
            .update({
              read_by: [...(reply.read_by || []), validation.validation.user.id]
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for user reply to request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message } = body

    // Check user permissions
    const validation = await requireUser(request)
    if (validation.response) {
      return validation.response
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Check that request belongs to user
    const { data: callback, error: callbackError } = await supabase
      .from('callback_requests')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('user_id', validation.validation.user.id)
      .single()

    if (callbackError || !callback) {
      return NextResponse.json(
        { error: 'Request not found or access denied' },
        { status: 404 }
      )
    }

    // Create user reply
    const { data: reply, error: replyError } = await supabase
      .from('callback_replies')
      .insert([
        {
          callback_request_id: id,
          user_id: validation.validation.user.id,
          message: message.trim(),
          is_from_admin: false
        }
      ])
      .select()
      .single()

    if (replyError) {
      console.error('Error creating user reply:', replyError)
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      )
    }

    // Update request status to "waiting for response"
    await supabase
      .from('callback_requests')
      .update({ 
        status: 'waiting_response',
        last_contacted_at: new Date().toISOString()
      })
      .eq('id', id)

    // Create notification for administrators
    await supabase
      .from('callback_notifications')
      .insert([
        {
          callback_request_id: id,
          user_id: validation.validation.user.id,
          notification_type: 'user_reply',
          channel: 'telegram',
          status: 'pending',
          metadata: {
            user_name: validation.validation.user.name,
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
