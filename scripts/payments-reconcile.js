'use strict'

// Reconcile pending Stripe payments against Stripe API and update Supabase

const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Prefer .env.local (Next.js convention), fallback to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath })
} else {
    dotenv.config()
}

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

async function main() {
    const windowMinutes = Number(process.env.RECONCILE_WINDOW_MINUTES || '15')
    const limit = Number(process.env.RECONCILE_BATCH_LIMIT || '100')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const stripeSecret = process.env.STRIPE_SECRET_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
        process.exit(1)
    }
    if (!stripeSecret) {
        console.error('Missing STRIPE_SECRET_KEY in environment')
        process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-07-30.basil' })

    const { data: pending, error: qErr } = await supabase
        .from('purchases')
        .select('*')
        .eq('payment_status', 'pending')
        .limit(limit)

    if (qErr) {
        console.error('Query error:', qErr.message)
        process.exit(1)
    }

    if (!pending || pending.length === 0) {
        console.log('No pending purchases to reconcile')
        return
    }

    console.log(`Reconciling ${pending.length} pending purchases (older than ${windowMinutes}m) ...`)

    const results = []

    for (const p of pending) {
        let nextStatus = 'pending'
        try {
            if (p.stripe_payment_intent_id) {
                const pi = await stripe.paymentIntents.retrieve(p.stripe_payment_intent_id)
                switch (pi.status) {
                    case 'succeeded':
                        nextStatus = 'completed'
                        break
                    case 'canceled':
                        nextStatus = 'failed'
                        break
                    default:
                        nextStatus = 'pending'
                }
            }

            if (nextStatus !== 'pending') {
                const { error: upErr } = await supabase
                    .from('purchases')
                    .update({ payment_status: nextStatus, updated_at: new Date().toISOString() })
                    .eq('id', p.id)
                    .neq('payment_status', 'completed')
                if (upErr) throw upErr
            }

            results.push({ id: p.id, prev: p.payment_status, next: nextStatus })
        } catch (e) {
            results.push({ id: p.id, prev: p.payment_status, error: e.message || String(e) })
        }
    }

    const summary = results.reduce(
        (acc, r) => {
            acc.total++
            if (r.next === 'completed') acc.completed++
            else if (r.next === 'failed') acc.failed++
            else if (r.error) acc.errors++
            else acc.pending++
            return acc
        },
        { total: 0, completed: 0, failed: 0, pending: 0, errors: 0 }
    )

    console.log('Reconcile summary:', summary)
    console.log('Details:', results)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})


