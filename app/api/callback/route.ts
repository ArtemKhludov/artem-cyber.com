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
    const supabase = getSupabaseAdmin()

    // Сначала проверяем, существует ли пользователь
    let existingUserId = null
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim())
        .single()

      if (existingUser) {
        existingUserId = existingUser.id
        console.log(`Найден существующий пользователь: ${existingUserId}`)
      }
    }

    // Создаем заявку с привязкой к существующему пользователю или без неё
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
          user_id: existingUserId, // Привязываем к существующему пользователю если найден
          auto_created_user: false, // Не создаем нового пользователя
          user_credentials_sent: false
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

    // Создаем уведомление для администратора о новой заявке
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
        // Не прерываем выполнение, если не удалось создать уведомление
      }
    }

    // Определяем, нужно ли пользователю зарегистрироваться
    // Проверяем по результату создания заявки, а не по исходной проверке
    const needsRegistration = !data.user_id && !!email

    console.log('Callback API Debug:', {
      data: data,
      user_id: data.user_id,
      email: email,
      needsRegistration: needsRegistration,
      userExists: !!data.user_id
    })

    return NextResponse.json({
      success: true,
      message: needsRegistration ? 'Заявка отправлена. Для отслеживания статуса необходимо зарегистрироваться.' : 'Заявка успешно отправлена',
      data: {
        ...data,
        needs_registration: needsRegistration,
        user_exists: !!data.user_id
      }
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
