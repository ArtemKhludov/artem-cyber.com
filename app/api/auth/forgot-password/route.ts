import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email-service'
import { getPasswordResetEmailTemplate } from '@/lib/email-templates'
import { verifyRequestOriginSmart } from '@/lib/security'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Check origin for CSRF protection
    try {
      verifyRequestOriginSmart(request, {
        allowSameDomain: true
      })
    } catch (error) {
      console.error('Origin verification failed for forgot password:', error)
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const supabase = getSupabaseAdmin()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !user) {
      // Return success even if user not found (for security)
      return NextResponse.json({
        success: true,
        message: 'If a user with this email exists, a password recovery email has been sent to them'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Save token to database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })

    if (tokenError) {
      console.error('Error saving reset token:', tokenError)
      return NextResponse.json({ error: 'Error creating reset token' }, { status: 500 })
    }

    // Create reset URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://www.energylogic-ai.com')

    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

    // Send email
    const emailContent = getPasswordResetEmailTemplate({
      name: user.name || 'User',
      email: user.email,
      resetToken,
      resetUrl,
      expiresIn: '1 hour'
    })

    const emailSent = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    if (!emailSent) {
      console.error('Failed to send password reset email')
      return NextResponse.json({ error: 'Error sending email' }, { status: 500 })
    }

    console.log(`Password reset email sent to ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Password recovery email has been sent to your email'
    })

  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
