import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email-service'
import { getPasswordResetEmailTemplate } from '@/lib/email-templates'
import { verifyRequestOriginSmart } from '@/lib/security'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Проверка origin для CSRF защиты
    try {
      verifyRequestOriginSmart(request, {
        allowSameDomain: true
      })
    } catch (error) {
      console.error('Origin verification failed for forgot password:', error)
      return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
    }

    // Проверяем, существует ли пользователь
    const supabase = getSupabaseAdmin()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !user) {
      // Возвращаем успех даже если пользователь не найден (для безопасности)
      return NextResponse.json({ 
        success: true, 
        message: 'Если пользователь с таким email существует, на него отправлено письмо для восстановления пароля' 
      })
    }

    // Генерируем токен восстановления
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 час

    // Сохраняем токен в базе данных
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
      return NextResponse.json({ error: 'Ошибка при создании токена восстановления' }, { status: 500 })
    }

    // Создаем URL для восстановления
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.NODE_ENV === 'development' 
                     ? 'http://localhost:3000' 
                     : 'https://www.energylogic-ai.com')
    
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

    // Отправляем email
    const emailContent = getPasswordResetEmailTemplate({
      name: user.name || 'Пользователь',
      email: user.email,
      resetToken,
      resetUrl,
      expiresIn: '1 час'
    })

    const emailSent = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    if (!emailSent) {
      console.error('Failed to send password reset email')
      return NextResponse.json({ error: 'Ошибка при отправке письма' }, { status: 500 })
    }

    console.log(`Password reset email sent to ${user.email}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Письмо для восстановления пароля отправлено на ваш email' 
    })

  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
