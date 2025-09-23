import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyPaymentTelegram } from '@/lib/notify'
import { syncCourseAccessByStatus } from '@/lib/course-access'

// Ensure Node runtime for raw body access
export const runtime = 'nodejs'

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

        const sessionId = session.id
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id || null

        // 1) Try update purchases (payment_status)
        const { data: purchasesUpdated, error: purchasesErr } = await supabase
          .from('purchases')
          .update({
            payment_status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .or([
            `stripe_session_id.eq.${sessionId}`,
            paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : ''
          ].filter(Boolean).join(','))
          .neq('payment_status', 'completed')
          .select('id, document_id, user_id, user_email, payment_method')

        if (purchasesErr) {
          console.error('Error updating purchases (completed):', purchasesErr)
        }

        // 2) Fallback: update purchase_requests (status)
        const { data: requestsUpdated, error: requestsErr } = await supabase
          .from('purchase_requests')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .or([
            `stripe_session_id.eq.${sessionId}`,
            paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : ''
          ].filter(Boolean).join(','))
          .neq('status', 'completed')
          .select()

        if (requestsErr) {
          console.error('Error updating purchase_requests (completed):', requestsErr)
        }

        // Telegram notification (Payments topic)
        const purchase = purchasesUpdated?.[0] || requestsUpdated?.[0]
        if (purchase) {
          const telegramMessage = `✅ Stripe checkout.session.completed\n` +
            `Email: ${purchase.user_email || purchase.email || '—'}\n` +
            `Doc: ${purchase.document_id || '—'}\n` +
            `Amount: ${(purchase.amount_paid ?? purchase.amount ?? '')} ${purchase.currency || ''}\n` +
            `PI/Session: ${paymentIntentId || sessionId}`
          notifyPaymentTelegram(telegramMessage).catch((e) => console.error('Telegram notify error:', e))
        }

        console.log('Payment completed:', sessionId)

        // Синхронизируем user_course_access с новым успешным платежом
        await syncCourseAccessByStatus(supabase, purchasesUpdated, 'completed', {
          source: 'stripe',
          metadata: {
            event: event.type,
            session_id: sessionId,
            payment_intent_id: paymentIntentId,
          },
        })
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const supabase = getSupabaseAdmin()

        const sessionId = session.id
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id || null

        // purchases -> failed (do not regress from completed)
        const { data: failedPurchases, error: purchasesErr } = await supabase
          .from('purchases')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .or([
            `stripe_session_id.eq.${sessionId}`,
            paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : ''
          ].filter(Boolean).join(','))
          .neq('payment_status', 'completed')
          .select('id, document_id, user_id, user_email, payment_method')

        if (purchasesErr) {
          console.error('Error updating purchases (expired):', purchasesErr)
        }

        // purchase_requests -> failed
        const { error: requestsErr } = await supabase
          .from('purchase_requests')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .or([
            `stripe_session_id.eq.${sessionId}`,
            paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : ''
          ].filter(Boolean).join(','))
          .neq('status', 'completed')

        if (requestsErr) {
          console.error('Error updating purchase_requests (expired):', requestsErr)
        }

        console.log('Payment session expired:', sessionId)
        notifyPaymentTelegram(`⚠️ Stripe checkout.session.expired\nSession: ${sessionId}\nPI: ${paymentIntentId || '—'}`).catch(() => { })

        // Отзываем доступ, если платеж не завершился
        await syncCourseAccessByStatus(supabase, failedPurchases, 'failed', {
          source: 'stripe',
          reason: 'checkout_session_expired',
          metadata: {
            event: event.type,
            session_id: sessionId,
            payment_intent_id: paymentIntentId,
          },
        })
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const supabase = getSupabaseAdmin()
        const paymentIntentId = pi.id

        const { data: purchasesCompleted, error: purchasesErr } = await supabase
          .from('purchases')
          .update({ payment_status: 'completed', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .neq('payment_status', 'completed')
          .select('id, document_id, user_id, user_email, payment_method')

        if (purchasesErr) {
          console.error('Error updating purchases (pi.succeeded):', purchasesErr)
        }

        const { error: requestsErr } = await supabase
          .from('purchase_requests')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .neq('status', 'completed')

        if (requestsErr) {
          console.error('Error updating purchase_requests (pi.succeeded):', requestsErr)
        }

        console.log('PaymentIntent succeeded:', paymentIntentId)
        notifyPaymentTelegram(`✅ Stripe payment_intent.succeeded\nPI: ${paymentIntentId}\nAmount: ${(pi.amount_received / 100).toFixed(2)} ${pi.currency.toUpperCase()}`).catch(() => { })

        await syncCourseAccessByStatus(supabase, purchasesCompleted, 'completed', {
          source: 'stripe',
          metadata: {
            event: event.type,
            payment_intent_id: paymentIntentId,
          },
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const supabase = getSupabaseAdmin()

        // Помечаем покупку как неудачную
        const { data: failedPurchases, error } = await supabase
          .from('purchases')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .select('id, document_id, user_id, user_email, payment_method')

        if (error) {
          console.error('Error updating failed payment:', error)
        }

        // purchase_requests -> failed (fallback)
        const { error: requestsErr } = await supabase
          .from('purchase_requests')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .neq('status', 'completed')

        if (requestsErr) {
          console.error('Error updating purchase_requests (pi.failed):', requestsErr)
        }

        console.log('Payment failed:', paymentIntent.id)
        notifyPaymentTelegram(`❌ Stripe payment_intent.payment_failed\nPI: ${paymentIntent.id}`).catch(() => { })

        await syncCourseAccessByStatus(supabase, failedPurchases, 'failed', {
          source: 'stripe',
          reason: 'payment_intent_failed',
          metadata: {
            event: event.type,
            payment_intent_id: paymentIntent.id,
          },
        })
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const supabase = getSupabaseAdmin()
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

        const { data: refundedPurchases, error: purchasesErr } = await supabase
          .from('purchases')
          .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .select('id, document_id, user_id, user_email, payment_method')

        if (purchasesErr) {
          console.error('Error updating purchases (refunded):', purchasesErr)
        }

        const { error: requestsErr } = await supabase
          .from('purchase_requests')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntentId)

        if (requestsErr) {
          console.error('Error updating purchase_requests (refunded):', requestsErr)
        }

        console.log('Charge refunded:', charge.id)
        notifyPaymentTelegram(`↩️ Stripe charge.refunded\nCharge: ${charge.id}\nPI: ${paymentIntentId || '—'}`).catch(() => { })

        // При возврате блокируем доступ к курсу
        await syncCourseAccessByStatus(supabase, refundedPurchases, 'refunded', {
          source: 'stripe',
          reason: 'charge_refunded',
          metadata: {
            event: event.type,
            charge_id: charge.id,
            payment_intent_id: paymentIntentId,
          },
        })
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
