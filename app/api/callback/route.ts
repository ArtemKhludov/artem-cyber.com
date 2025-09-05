import { NextRequest, NextResponse } from 'next/server'
import { addToSheets } from '../../../lib/google-sheets'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, preferred_time, message, source_page, product_type, product_name, notes } = body

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
          source_page: source_page || 'unknown',
          product_type: product_type || 'callback',
          product_name: product_name || 'Заказ звонка',
          notes: notes || null,
          source: 'website'
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

    // Синхронизация с Google Sheets
    try {
      await addToSheets('request', data)
    } catch (sheetsError) {
      console.error('Google Sheets sync error:', sheetsError)
    }

    // Отправка уведомления в Telegram
    try {
      const telegramMessage = `🆕 Новая заявка из CRM-системы:
👤 Имя: ${name}
📧 Email: ${email || 'Не указан'}
📞 Телефон: ${phone}
📦 Тип: ${product_type || 'callback'}
🛍️ Товар/Услуга: ${product_name || 'Заказ звонка'}
�� Заметки: ${notes || 'Нет'}
🌐 Источник: ${source_page === '/' ? 'Главная страница' :
          source_page === '/about' ? 'О проекте' :
            source_page === '/contacts' ? 'Контакты' :
              source_page === '/catalog' ? 'Каталог' :
                source_page === '/book' ? 'Программы' :
                  source_page === '/chat' ? 'Чат' :
                    source_page || 'Не указан'}`

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
      }
    } catch (telegramError) {
      console.error('Telegram error:', telegramError)
    }

    return NextResponse.json({
      success: true,
      message: 'Заявка успешно отправлена',
      data: data
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
