import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const { documentId, amount, currency = 'RUB', userEmail, userCountry, userIP } = await request.json()

        // Validate required fields
        if (!documentId || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields: documentId, amount' },
                { status: 400 }
            )
        }

        // Получаем документ из базы данных
        const { data: document, error: docError } = await supabaseAdmin
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

        // Создаем запись о покупке в статусе pending
        const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .insert({
                document_id: documentId,
                user_email: userEmail || 'test@example.com',
                payment_method: 'stripe',
                payment_status: 'pending',
                amount_paid: amount,
                currency: currency.toUpperCase(),
                user_country: userCountry,
                user_ip: userIP,
            })
            .select()
            .single()

        if (purchaseError) {
            console.error('Purchase creation error:', purchaseError)
            return NextResponse.json(
                { error: 'Failed to create purchase record' },
                { status: 500 }
            )
        }

        // Create Stripe payment intent
        const stripe = getStripeInstance()
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to kopecks
            currency: currency.toLowerCase(),
            metadata: {
                purchaseId: purchase.id,
                documentId,
                userEmail: userEmail || 'test@example.com',
            },
        })

        // Update purchase with payment intent ID
        await supabaseAdmin
            .from('purchases')
            .update({ stripe_payment_intent_id: paymentIntent.id })
            .eq('id', purchase.id)

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            purchaseId: purchase.id,
        })

    } catch (error) {
        console.error('Payment intent creation error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
