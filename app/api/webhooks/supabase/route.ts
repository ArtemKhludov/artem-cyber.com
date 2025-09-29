import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyTelegram } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, table, record, old_record } = body

    console.log('📡 Supabase webhook received:', { type, table })

    // Проверяем подпись webhook (рекомендуется для продакшена)
    const signature = request.headers.get('x-supabase-signature')
    if (!signature) {
      console.warn('⚠️ No signature provided')
      // В продакшене здесь должна быть проверка подписи
    }

    // Обрабатываем разные типы событий
    switch (table) {
      case 'documents':
        await handleDocumentChange(type, record, old_record)
        break
      case 'purchases':
        await handlePurchaseChange(type, record, old_record)
        break
      case 'users':
        await handleUserChange(type, record, old_record)
        break
      case 'issue_reports':
        await handleIssueChange(type, record, old_record)
        break
      default:
        console.log(`📝 Unhandled table: ${table}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleDocumentChange(type: string, record: any, old_record: any) {
  console.log(`📄 Document ${type}:`, record?.title || record?.id)
  
  if (type === 'INSERT') {
    // Новый документ добавлен
    await notifyTelegram(
      `📚 Новый документ добавлен: ${record.title}\n` +
      `📝 Описание: ${record.description || 'Без описания'}\n` +
      `🔗 ID: ${record.id}`,
      {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
        disableWebPagePreview: true
      }
    )
  }
}

async function handlePurchaseChange(type: string, record: any, old_record: any) {
  console.log(`💳 Purchase ${type}:`, record?.product_name || record?.id)
  
  if (type === 'INSERT') {
    // Новая покупка
    await notifyTelegram(
      `🛒 Новая покупка!\n` +
      `📦 Товар: ${record.product_name}\n` +
      `💰 Сумма: ${record.amount_paid} ${record.currency}\n` +
      `👤 Покупатель: ${record.user_email}\n` +
      `🆔 ID: ${record.id}`,
      {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
        disableWebPagePreview: true
      }
    )
  }
}

async function handleUserChange(type: string, record: any, old_record: any) {
  console.log(`👤 User ${type}:`, record?.email || record?.id)
  
  if (type === 'INSERT') {
    // Новый пользователь зарегистрировался
    await notifyTelegram(
      `👋 Новый пользователь!\n` +
      `📧 Email: ${record.email}\n` +
      `👤 Имя: ${record.name || 'Не указано'}\n` +
      `📱 Телефон: ${record.phone || 'Не указан'}\n` +
      `🆔 ID: ${record.id}`,
      {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
        disableWebPagePreview: true
      }
    )
  }
}

async function handleIssueChange(type: string, record: any, old_record: any) {
  console.log(`🎫 Issue ${type}:`, record?.title || record?.id)
  
  if (type === 'INSERT') {
    // Новое обращение в поддержку
    await notifyTelegram(
      `🎫 Новое обращение в поддержку!\n` +
      `📝 Тема: ${record.title}\n` +
      `👤 Пользователь: ${record.user_email}\n` +
      `📊 Статус: ${record.status}\n` +
      `🆔 ID: ${record.id}`,
      {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
        messageThreadId: process.env.TELEGRAM_THREAD_ISSUES,
        disableWebPagePreview: true
      }
    )
  }
}
