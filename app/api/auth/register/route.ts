import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, пароль и имя обязательны' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен содержать минимум 6 символов' }, { status: 400 })
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Проверяем, существует ли пользователь в таблице users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 })
    }

    // Проверяем, существует ли CRM пользователь с таким email
    const { data: existingCrmUser } = await supabase
      .from('crm_users')
      .select('id, name, phone')
      .eq('email', email)
      .single()

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 12)

    // Создаем пользователя
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
        error: 'Ошибка создания пользователя',
        details: userError.message
      }, { status: 500 })
    }

    // Триггер автоматически создаст или обновит CRM пользователя
    console.log('✅ Пользователь создан, триггер автоматически обработает CRM пользователя')

    // Отправка уведомления в Telegram
    try {
      const telegramMessage = `🆕 Новый пользователь зарегистрирован:
👤 Имя: ${name}
📧 Email: ${email}
📞 Телефон: ${phone || 'Не указан'}
🔐 Тип регистрации: Стандартная
✅ Email верифицирован: Нет
📅 Дата: ${new Date().toLocaleString('ru-RU')}`

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
        console.log('✅ Telegram уведомление отправлено')
      }
    } catch (telegramError) {
      console.error('Telegram error:', telegramError)
    }

    return NextResponse.json({
      message: 'Пользователь успешно создан',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}