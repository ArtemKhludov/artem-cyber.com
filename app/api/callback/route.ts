import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyCallbackTelegram } from '@/lib/notify'
import { sendEmail } from '@/lib/email-service'
import { getCallbackConfirmationEmailTemplate } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, preferred_time, message, source_page, product_type, product_name, notes } = body

    // Валидация обязательных полей
    if (!name || (!phone && product_type !== 'chat_message') || !email) {
      return NextResponse.json(
        { error: 'Имя, телефон и email обязательны' },
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

    // ОБЯЗАТЕЛЬНАЯ РЕГИСТРАЦИЯ: Если пользователь не найден, возвращаем ошибку
    if (!data.user_id && email) {
      console.log('Callback API: User not found, registration required')
      return NextResponse.json({
        success: false,
        needs_registration: true,
        message: 'Для создания заявки необходимо зарегистрироваться. У вас уже есть аккаунт? Войдите в систему.',
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

    // Если пользователь не предоставил email, тоже требуем регистрацию
    if (!email) {
      return NextResponse.json({
        success: false,
        needs_registration: true,
        message: 'Для создания заявки необходимо указать email и зарегистрироваться. Это позволит вам отслеживать статус заявки и общаться со специалистами.',
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

    // Отправляем письмо подтверждения заявки
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
        // Не прерываем выполнение, если не удалось отправить email
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
      message: 'Заявка успешно отправлена и добавлена в ваш личный кабинет',
      data: {
        ...data,
        user_exists: true
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
