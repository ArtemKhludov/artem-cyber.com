import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const {
      documentId,
      amount,
      currency = 'rub',
      userEmail,
      userCountry,
      userIP,
      successUrl,
      cancelUrl,
    } = await request.json()

    if (!documentId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, amount' },
        { status: 400 }
      )
    }

    // Fetch document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: document.title,
              description: document.description.substring(0, 500), // Stripe limits length
              images: [document.cover_url],
            },
            unit_amount: Math.round(amount * 100), // Stripe expects minor units
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        documentId,
        userEmail: userEmail || '',
        userCountry: userCountry || '',
        userIP: userIP || '',
      },
      // Prefill email if provided
      ...(userEmail && {
        customer_email: userEmail,
      }),
    })

    // Create purchase record in pending status
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        document_id: documentId,
        payment_method: 'stripe',
        payment_status: 'pending',
        stripe_payment_intent_id: session.id,
        amount_paid: amount,
        currency: currency.toUpperCase(),
        user_email: userEmail,
        user_country: userCountry,
        user_ip: userIP,
      })

    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError)
      // Continue even if DB insert fails because Stripe session exists
    }

    return NextResponse.json({
      sessionUrl: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Stripe checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
