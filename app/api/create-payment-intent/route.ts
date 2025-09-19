import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { amount, sessionDate, sessionTime, userId } = await request.json()

    // Validate required fields
    if (!amount || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create order in database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        amount,
        amount_paid: amount,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'stripe',
        currency: 'RUB',
        session_date: sessionDate,
        session_time: sessionTime,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Create Stripe payment intent
    const stripe = getStripeInstance()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to kopecks
      currency: 'rub',
      metadata: {
        orderId: order.id,
        userId,
        sessionDate: sessionDate || '',
        sessionTime: sessionTime || '',
      },
    })

    // Update order with payment intent ID
    await supabaseAdmin
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order.id)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
