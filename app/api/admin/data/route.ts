import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Функция для отправки уведомлений в Telegram
async function sendTelegramNotification(message: string) {
  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!telegramResponse.ok) {
      console.error('Telegram notification failed:', await telegramResponse.text())
    }
  } catch (telegramError) {
    console.error('Telegram error:', telegramError)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    const supabase = getSupabaseAdmin()

    if (type === 'purchase') {
      const { data: result, error } = await supabase
        .from('purchase_requests')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error adding purchase:', error)
        return NextResponse.json(
          { error: 'Ошибка добавления покупки', details: error.message },
          { status: 500 }
        )
      }

      // Отправка уведомления в Telegram
      const telegramMessage = `🛒 Новая покупка из CRM-системы:
👤 Имя: ${data.name}
📧 Email: ${data.email || 'Не указан'}
📞 Телефон: ${data.phone}
📦 Тип товара: ${data.product_type}
🛍️ Название: ${data.product_name}
💰 Сумма: ${data.amount} ${data.currency}
💳 Способ оплаты: ${data.payment_method}
📝 Статус: ${data.status}
📝 Заметки: ${data.notes || 'Нет'}
🌐 Источник: ${data.source}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Покупка добавлена успешно'
      })
    } else if (type === 'request') {
      const { data: result, error } = await supabase
        .from('callback_requests')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error adding request:', error)
        return NextResponse.json(
          { error: 'Ошибка добавления заявки', details: error.message },
          { status: 500 }
        )
      }

      // Отправка уведомления в Telegram
      const telegramMessage = `🆕 Новая заявка из CRM-системы:
👤 Имя: ${data.name}
📧 Email: ${data.email || 'Не указан'}
📞 Телефон: ${data.phone}
📦 Тип: ${data.product_type || 'callback'}
🛍️ Товар/Услуга: ${data.product_name || 'Заказ звонка'}
📝 Заметки: ${data.notes || 'Нет'}
🌐 Источник: ${data.source_page || 'unknown'}
📊 Статус: ${data.status}
⭐ Приоритет: ${data.priority}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Заявка добавлена успешно'
      })
    }

    return NextResponse.json(
      { error: 'Неверный тип данных' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin data POST error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'requests'
    const supabase = getSupabaseAdmin()

    if (type === 'requests') {
      // Заявки (лиды) - из callback_requests
      const { data, error } = await supabase
        .from('callback_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching requests:', error)
        return NextResponse.json(
          { error: 'Ошибка загрузки заявок' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else if (type === 'purchases') {
      // Покупки - из purchase_requests
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching purchases:', error)
        return NextResponse.json(
          { error: 'Ошибка загрузки покупок' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else if (type === 'documents') {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('title', { ascending: true })

      if (error) {
        console.error('Error fetching documents:', error)
        return NextResponse.json(
          { error: 'Ошибка загрузки документов' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    }

    return NextResponse.json(
      { error: 'Неверный тип данных' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin data error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// PUT - Обновление заявки или покупки
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    const supabase = getSupabaseAdmin()

    if (type === 'purchase') {
      // Получаем старые данные для сравнения
      const { data: oldData, error: fetchError } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching old purchase data:', fetchError)
        return NextResponse.json(
          { error: 'Ошибка получения данных покупки' },
          { status: 500 }
        )
      }

      // Обновляем данные
      const { data: result, error } = await supabase
        .from('purchase_requests')
        .update({
          ...oldData,
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating purchase:', error)
        return NextResponse.json(
          { error: 'Ошибка обновления покупки', details: error.message },
          { status: 500 }
        )
      }

      // Отправка уведомления в Telegram
      const telegramMessage = `✏️ Покупка обновлена в CRM-системе:
🆔 ID: ${id}
👤 Имя: ${result.name}
📧 Email: ${result.email || 'Не указан'}
📞 Телефон: ${result.phone}
📦 Тип товара: ${result.product_type}
🛍️ Название: ${result.product_name}
💰 Сумма: ${result.amount} ${result.currency}
💳 Способ оплаты: ${result.payment_method}
📝 Статус: ${result.status}
📝 Заметки: ${result.notes || 'Нет'}
🌐 Источник: ${result.source}

📊 Изменения:
${Object.keys(data).map(key => {
        if (oldData[key] !== data[key]) {
          return `• ${key}: "${oldData[key]}" → "${data[key]}"`
        }
        return null
      }).filter(Boolean).join('\n') || '• Нет изменений'}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Покупка обновлена успешно'
      })

    } else if (type === 'request') {
      // Получаем старые данные для сравнения
      const { data: oldData, error: fetchError } = await supabase
        .from('callback_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching old request data:', fetchError)
        return NextResponse.json(
          { error: 'Ошибка получения данных заявки' },
          { status: 500 }
        )
      }

      // Обновляем данные
      const { data: result, error } = await supabase
        .from('callback_requests')
        .update({
          ...oldData,
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating request:', error)
        return NextResponse.json(
          { error: 'Ошибка обновления заявки', details: error.message },
          { status: 500 }
        )
      }

      // Отправка уведомления в Telegram
      const telegramMessage = `✏️ Заявка обновлена в CRM-системе:
🆔 ID: ${id}
👤 Имя: ${result.name}
📧 Email: ${result.email || 'Не указан'}
📞 Телефон: ${result.phone}
📝 Сообщение: ${result.message}
📅 Предпочтительное время: ${result.preferred_time || 'Не указано'}
📊 Статус: ${result.status}
📝 Заметки админа: ${result.admin_notes || 'Нет'}
🌐 Источник: ${result.source}
📦 Тип продукта: ${result.product_type}
🛍️ Название продукта: ${result.product_name}

📊 Изменения:
${Object.keys(data).map(key => {
        if (oldData[key] !== data[key]) {
          return `• ${key}: "${oldData[key]}" → "${data[key]}"`
        }
        return null
      }).filter(Boolean).join('\n') || '• Нет изменений'}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Заявка обновлена успешно'
      })
    }

    return NextResponse.json(
      { error: 'Неверный тип данных' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin update error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// DELETE - Удаление заявки или покупки
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Не указан тип или ID' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    if (type === 'purchase') {
      // Получаем данные перед удалением
      const { data: oldData, error: fetchError } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching purchase data:', fetchError)
        return NextResponse.json(
          { error: 'Ошибка получения данных покупки' },
          { status: 500 }
        )
      }

      // Удаляем данные
      const { error } = await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting purchase:', error)
        return NextResponse.json(
          { error: 'Ошибка удаления покупки', details: error.message },
          { status: 500 }
        )
      }

      // Отправка уведомления в Telegram
      const telegramMessage = `🗑️ Покупка удалена из CRM-системы:
🆔 ID: ${id}
👤 Имя: ${oldData.name}
📧 Email: ${oldData.email || 'Не указан'}
📞 Телефон: ${oldData.phone}
📦 Тип товара: ${oldData.product_type}
🛍️ Название: ${oldData.product_name}
💰 Сумма: ${oldData.amount} ${oldData.currency}
💳 Способ оплаты: ${oldData.payment_method}
📝 Статус: ${oldData.status}
📝 Заметки: ${oldData.notes || 'Нет'}
🌐 Источник: ${oldData.source}
📅 Дата создания: ${new Date(oldData.created_at).toLocaleString('ru-RU')}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        message: 'Покупка удалена успешно'
      })

    } else if (type === 'request') {
      // Получаем данные перед удалением
      const { data: oldData, error: fetchError } = await supabase
        .from('callback_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching request data:', fetchError)
        return NextResponse.json(
          { error: 'Ошибка получения данных заявки' },
          { status: 500 }
        )
      }

      // Удаляем данные
      const { error } = await supabase
        .from('callback_requests')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting request:', error)
        return NextResponse.json(
          { error: 'Ошибка удаления заявки', details: error.message },
          { status: 500 }
        )
      }

      // Отправка уведомления в Telegram
      const telegramMessage = `🗑️ Заявка удалена из CRM-системы:
🆔 ID: ${id}
👤 Имя: ${oldData.name}
📧 Email: ${oldData.email || 'Не указан'}
📞 Телефон: ${oldData.phone}
📝 Сообщение: ${oldData.message}
📅 Предпочтительное время: ${oldData.preferred_time || 'Не указано'}
📊 Статус: ${oldData.status}
📝 Заметки админа: ${oldData.admin_notes || 'Нет'}
🌐 Источник: ${oldData.source}
📦 Тип продукта: ${oldData.product_type}
🛍️ Название продукта: ${oldData.product_name}
📅 Дата создания: ${new Date(oldData.created_at).toLocaleString('ru-RU')}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        message: 'Заявка удалена успешно'
      })
    }

    return NextResponse.json(
      { error: 'Неверный тип данных' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin delete error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
