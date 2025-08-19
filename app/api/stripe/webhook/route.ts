import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// Это должно быть настроено в Stripe Dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

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
        
        // Обновляем статус покупки в базе данных
        const { error } = await supabase
          .from('purchases')
          .update({
            payment_status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', session.id)

        if (error) {
          console.error('Error updating purchase status:', error)
          return NextResponse.json(
            { error: 'Failed to update purchase status' },
            { status: 500 }
          )
        }

        console.log('Payment completed:', session.id)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Помечаем покупку как неудачную
        const { error } = await supabase
          .from('purchases')
          .update({
            payment_status: 'failed',
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
