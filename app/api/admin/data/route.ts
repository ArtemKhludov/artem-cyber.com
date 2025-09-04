import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

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
      try {
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

        const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
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

        if (!telegramResponse.ok) {
          console.error('Telegram notification failed:', await telegramResponse.text())
        }
      } catch (telegramError) {
        console.error('Telegram error:', telegramError)
      }

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
      try {
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

        const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
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

        if (!telegramResponse.ok) {
          console.error('Telegram notification failed:', await telegramResponse.text())
        }
      } catch (telegramError) {
        console.error('Telegram error:', telegramError)
      }

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
