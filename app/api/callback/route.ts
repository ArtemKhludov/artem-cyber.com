import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, preferred_time, message, source_page } = body

    // Валидация обязательных полей
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Имя и телефон обязательны' },
        { status: 400 }
      )
    }

    // Валидация телефона (базовая проверка)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Неверный формат телефона' },
        { status: 400 }
      )
    }

    // Валидация email (если предоставлен)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Неверный формат email' },
          { status: 400 }
        )
      }
    }

    // Сохранение заявки в базу данных
    const { data, error } = await supabase
      .from('callback_requests')
      .insert([
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          preferred_time: preferred_time?.trim() || null,
          message: message?.trim() || null,
          source_page: source_page || 'unknown'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Ошибка сохранения заявки' },
        { status: 500 }
      )
    }

    // Отправка уведомления в Telegram
    await sendNotification(data)

    return NextResponse.json(
      { 
        success: true, 
        message: 'Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.',
        id: data.id 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

async function sendNotification(request: any) {
  try {
    // Отправка уведомления в Telegram
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await sendTelegramNotification(request)
    }

  } catch (error) {
    console.error('Notification error:', error)
    // Не прерываем основной поток, если уведомление не отправилось
  }
}

async function sendTelegramNotification(request: any) {
  const message = `
🔔 Новая заявка на обратный звонок!

👤 Имя: ${request.name}
📞 Телефон: ${request.phone}
${request.email ? `📧 Email: ${request.email}` : ''}
${request.preferred_time ? `⏰ Удобное время: ${request.preferred_time}` : ''}
${request.message ? `💬 Сообщение: ${request.message}` : ''}
📄 Страница: ${request.source_page}
🕐 Время заявки: ${new Date(request.created_at).toLocaleString('ru-RU')}

ID: ${request.id}
  `.trim()

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`)
  }
}


