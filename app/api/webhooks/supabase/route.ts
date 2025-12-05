import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyTelegram } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, table, record, old_record } = body

    console.log('📡 Supabase webhook received:', { type, table })

    // Verify webhook signature (recommended in production)
    const signature = request.headers.get('x-supabase-signature')
    if (!signature) {
      console.warn('⚠️ No signature provided')
      // In production you should validate the signature here
    }

    // Handle different table events
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
    // New document added
    await notifyTelegram(
      `📚 New document added: ${record.title}\n` +
      `📝 Description: ${record.description || 'No description'}\n` +
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
    // New purchase
    await notifyTelegram(
      `🛒 New purchase!\n` +
      `📦 Item: ${record.product_name}\n` +
      `💰 Amount: ${record.amount_paid} ${record.currency}\n` +
      `👤 Buyer: ${record.user_email}\n` +
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
    // New user registered
    await notifyTelegram(
      `👋 New user!\n` +
      `📧 Email: ${record.email}\n` +
      `👤 Name: ${record.name || 'Not provided'}\n` +
      `📱 Phone: ${record.phone || 'Not provided'}\n` +
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
    // New support ticket
    await notifyTelegram(
      `🎫 New support ticket!\n` +
      `📝 Subject: ${record.title}\n` +
      `👤 User: ${record.user_email}\n` +
      `📊 Status: ${record.status}\n` +
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
