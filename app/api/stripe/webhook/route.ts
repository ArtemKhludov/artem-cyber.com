import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// Это должно быть настроено в Stripe Dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  try {
    // Проверяем подпись webhook
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Обрабатываем различные типы событий
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const supabase = getSupabaseAdmin()

        // Обновляем статус покупки в базе данных
        const { data: purchase, error } = await supabase
          .from('purchase_requests')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', session.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating purchase status:', error)
          return NextResponse.json(
            { error: 'Failed to update purchase status' },
            { status: 500 }
          )
        }

        // Отправка уведомления в Telegram
        if (purchase) {
          try {
            const telegramMessage = `🛒 Новая покупка через Stripe:
👤 Имя: ${purchase.name}
📧 Email: ${purchase.email || 'Не указан'}
📞 Телефон: ${purchase.phone}
📦 Тип товара: ${purchase.product_type}
🛍️ Название: ${purchase.product_name}
💰 Сумма: ${purchase.amount} ${purchase.currency}
💳 Способ оплаты: ${purchase.payment_method}
📝 Статус: ${purchase.status}
📝 Заметки: ${purchase.notes || 'Нет'}
🌐 Источник: ${purchase.source}
💳 Stripe ID: ${session.id}`

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
        }

        console.log('Payment completed:', session.id)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const supabase = getSupabaseAdmin()

        // Помечаем покупку как неудачную
        const { error } = await supabase
          .from('purchase_requests')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', session.id)

        if (error) {
          console.error('Error updating expired session:', error)
        }

        console.log('Payment session expired:', session.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const supabase = getSupabaseAdmin()

        // Помечаем покупку как неудачную
        const { error } = await supabase
          .from('purchases')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (error) {
          console.error('Error updating failed payment:', error)
        }

        console.log('Payment failed:', paymentIntent.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }
}
