import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyCallbackTelegram } from '@/lib/notify'
import { sendEmail } from '@/lib/email-service'
import { getCallbackConfirmationEmailTemplate } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, preferred_time, message, source_page, product_type, product_name, notes } = body

    // Validate required fields
    if (!name || (!phone && product_type !== 'chat_message') || !email) {
      return NextResponse.json(
        { error: 'Name, phone and email are required' },
        { status: 400 }
      )
    }

    // Phone validation (basic check) - skip for chat
    if (product_type !== 'chat_message' && phone) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: 'Invalid phone format' },
          { status: 400 }
        )
      }
    }

    // Email validation (if provided) - skip for chat
    if (email && product_type !== 'chat_message') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Save request to database
    const supabase = getSupabaseAdmin()

    // First check if user exists
    let existingUserId = null
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim())
        .single()

      if (existingUser) {
        existingUserId = existingUser.id
        console.log(`Found existing user: ${existingUserId}`)
      }
    }

    // Create request with link to existing user or without
    const { data, error } = await supabase
      .from('callback_requests')
      .insert([
        {
          name: name.trim(),
          phone: phone?.trim() || 'Not provided',
          email: email?.trim() || null,
          preferred_time: preferred_time?.trim() || null,
          message: message?.trim() || null,
          source_page: source_page || 'unknown',
          product_type: product_type || 'callback',
          product_name: product_name || 'Callback Request',
          notes: notes || null,
          source: 'website',
          status: 'new',
          user_id: existingUserId, // Link to existing user if found
          auto_created_user: false, // Don't create new user
          user_credentials_sent: false
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Error saving request', details: error.message },
        { status: 500 }
      )
    }

    // Send notification to Telegram (to Callbacks thread)
    const telegramMessage = `🆕 New request from CRM system:\n` +
      `👤 Name: ${name}\n` +
      `📧 Email: ${email || 'Not provided'}\n` +
      `📞 Phone: ${phone}\n` +
      `📦 Type: ${product_type || 'callback'}\n` +
      `🛍️ Product/Service: ${product_name || 'Callback Request'}\n` +
      `📝 Notes: ${notes || 'None'}\n` +
      `🌐 Source: ${source_page || 'Not specified'}`

    notifyCallbackTelegram(telegramMessage).catch((e) =>
      console.error('Telegram callback notify error:', e)
    )

    // Create notification for admin about new request
    if (data.id) {
      try {
        await supabase
          .from('callback_notifications')
          .insert([
            {
              callback_request_id: data.id,
              user_id: data.user_id,
              notification_type: 'new_callback_request',
              channel: 'telegram',
              status: 'pending',
              metadata: {
                user_name: data.name,
                user_email: data.email,
                user_phone: data.phone,
                product_type: data.product_type,
                message: data.message
              }
            }
          ])
      } catch (error) {
        console.error('Error creating admin notification:', error)
        // Don't interrupt execution if notification creation failed
      }
    }

    // MANDATORY REGISTRATION: If user not found, return error
    if (!data.user_id && email) {
      console.log('Callback API: User not found, registration required')
      return NextResponse.json({
        success: false,
        needs_registration: true,
        message: 'Registration is required to create a request. Do you already have an account? Please sign in.',
        data: {
          email: email,
          name: name,
          phone: phone,
          message: message,
          preferred_time: preferred_time,
          source_page: source_page,
          product_type: product_type,
          product_name: product_name,
          notes: notes
        }
      }, { status: 400 })
    }

    // If user didn't provide email, also require registration
    if (!email) {
      return NextResponse.json({
        success: false,
        needs_registration: true,
        message: 'Email is required to create a request. Registration will allow you to track request status and communicate with specialists.',
        data: {
          name: name,
          phone: phone,
          message: message,
          preferred_time: preferred_time,
          source_page: source_page,
          product_type: product_type,
          product_name: product_name,
          notes: notes
        }
      }, { status: 400 })
    }

    // Send request confirmation email
    if (data.user_id && email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://www.energylogic-ai.com')

        const emailContent = getCallbackConfirmationEmailTemplate({
          name: data.name,
          email: data.email,
          callbackId: data.id,
          message: data.message || '',
          phone: data.phone,
          preferredTime: data.preferred_time || '',
          dashboardUrl: `${baseUrl}/dashboard`,
          loginUrl: `${baseUrl}/auth/login`
        })

        await sendEmail({
          to: data.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        })

        console.log(`Callback confirmation email sent to ${data.email}`)
      } catch (emailError) {
        console.error('Error sending callback confirmation email:', emailError)
        // Don't interrupt execution if email sending failed
      }
    }

    console.log('Callback API Debug:', {
      data: data,
      user_id: data.user_id,
      email: email,
      userExists: !!data.user_id
    })

    return NextResponse.json({
      success: true,
      message: 'Request successfully submitted and added to your dashboard',
      data: {
        ...data,
        user_exists: true
      }
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
