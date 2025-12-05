import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Check if user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 })
    }

    // Check if CRM user exists with this email
    const { data: existingCrmUser } = await supabase
      .from('crm_users')
      .select('id, name, phone')
      .eq('email', email)
      .single()

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role: 'user',
        phone: phone || null,
        email_verified: false
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json({
        error: 'Failed to create user',
        details: userError.message
      }, { status: 500 })
    }

    // Trigger will automatically create or update CRM user
    console.log('✅ User created; trigger will auto-sync CRM user')

    // Telegram notification
    try {
      const telegramMessage = `🆕 New user registered:
👤 Name: ${name}
📧 Email: ${email}
📞 Phone: ${phone || 'Not provided'}
🔐 Registration type: Standard
✅ Email verified: No
📅 Date: ${new Date().toLocaleString('en-US')}`

      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'HTML'
        })
      })

      if (!response.ok) {
        console.error('Telegram notification failed:', await response.text())
      } else {
        console.log('✅ Telegram notification sent')
      }
    } catch (telegramError) {
      console.error('Telegram error:', telegramError)
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
