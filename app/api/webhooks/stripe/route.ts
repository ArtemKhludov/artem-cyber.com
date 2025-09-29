import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyTelegram } from '@/lib/notify'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('💳 Stripe webhook received:', event.type)

    // Обрабатываем разные типы событий
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      default:
        console.log(`📝 Unhandled Stripe event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('✅ Payment succeeded:', paymentIntent.id)
  
  const supabase = getSupabaseAdmin()
  
  // Обновляем статус покупки в базе данных
  const { error } = await supabase
    .from('purchases')
    .update({ 
      status: 'completed',
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('❌ Failed to update purchase:', error)
  }

  // Уведомляем в Telegram
  await notifyTelegram(
    `💳 Платеж успешно обработан!\n` +
    `🆔 Payment Intent: ${paymentIntent.id}\n` +
    `💰 Сумма: ${paymentIntent.amount / 100} ${paymentIntent.currency?.toUpperCase()}\n` +
    `📧 Email: ${paymentIntent.receipt_email || 'Не указан'}`,
    {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      messageThreadId: process.env.TELEGRAM_THREAD_PAYMENTS,
      disableWebPagePreview: true
    }
  )
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id)
  
  const supabase = getSupabaseAdmin()
  
  // Обновляем статус покупки
  const { error } = await supabase
    .from('purchases')
    .update({ 
      status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('❌ Failed to update purchase:', error)
  }

  // Уведомляем в Telegram
  await notifyTelegram(
    `❌ Платеж не прошел!\n` +
    `🆔 Payment Intent: ${paymentIntent.id}\n` +
    `💰 Сумма: ${paymentIntent.amount / 100} ${paymentIntent.currency?.toUpperCase()}\n` +
    `📧 Email: ${paymentIntent.receipt_email || 'Не указан'}\n` +
    `⚠️ Причина: ${paymentIntent.last_payment_error?.message || 'Неизвестно'}`,
    {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      messageThreadId: process.env.TELEGRAM_THREAD_PAYMENTS,
      disableWebPagePreview: true
    }
  )
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🛒 Checkout completed:', session.id)
  
  // Уведомляем в Telegram
  await notifyTelegram(
    `🛒 Заказ завершен!\n` +
    `🆔 Session ID: ${session.id}\n` +
    `💰 Сумма: ${session.amount_total ? session.amount_total / 100 : 0} ${session.currency?.toUpperCase()}\n` +
    `📧 Email: ${session.customer_email || 'Не указан'}\n` +
    `📦 Товары: ${session.metadata?.products || 'Не указаны'}`,
    {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      messageThreadId: process.env.TELEGRAM_THREAD_PAYMENTS,
      disableWebPagePreview: true
    }
  )
}
