import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyCallbackTelegram } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, preferred_time, message, source_page, product_type, product_name, notes } = body

    // Валидация обязательных полей
    if (!name || (!phone && product_type !== 'chat_message')) {
      return NextResponse.json(
        { error: 'Имя и телефон обязательны' },
        { status: 400 }
      )
    }

    // Валидация телефона (базовая проверка) - пропускаем для чата
    if (product_type !== 'chat_message' && phone) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: 'Неверный формат телефона' },
          { status: 400 }
        )
      }
    }

    // Валидация email (если предоставлен) - пропускаем для чата
    if (email && product_type !== 'chat_message') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Неверный формат email' },
          { status: 400 }
        )
      }
    }

    // Сохранение заявки в базу данных
    // Триггер автоматически создаст или свяжет пользователя
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('callback_requests')
      .insert([
        {
          name: name.trim(),
          phone: phone?.trim() || 'Не указан',
          email: email?.trim() || null,
          preferred_time: preferred_time?.trim() || null,
          message: message?.trim() || null,
          source_page: source_page || 'unknown',
          product_type: product_type || 'callback',
          product_name: product_name || 'Заказ звонка',
          notes: notes || null,
          source: 'website',
          status: 'new',
          priority: 'medium'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Ошибка сохранения заявки', details: error.message },
        { status: 500 }
      )
    }

    // Синхронизация с Google Sheets (отключена для тестирования)
    // try {
    //   await addToSheets('request', data)
    // } catch (sheetsError) {
    //   console.error('Google Sheets sync error:', sheetsError)
    // }

    // Отправка уведомления в Telegram (в тему Callbacks)
    const telegramMessage = `🆕 Новая заявка из CRM-системы:\n` +
      `👤 Имя: ${name}\n` +
      `📧 Email: ${email || 'Не указан'}\n` +
      `📞 Телефон: ${phone}\n` +
      `📦 Тип: ${product_type || 'callback'}\n` +
      `🛍️ Товар/Услуга: ${product_name || 'Заказ звонка'}\n` +
      `📝 Заметки: ${notes || 'Нет'}\n` +
      `🌐 Источник: ${source_page || 'Не указан'}`

    notifyCallbackTelegram(telegramMessage).catch((e) =>
      console.error('Telegram callback notify error:', e)
    )

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
