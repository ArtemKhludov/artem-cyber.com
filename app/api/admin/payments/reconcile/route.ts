import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getStripeInstance } from '@/lib/stripe'
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/session'
import { syncCourseAccessByStatus } from '@/lib/course-access'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        // Auth: only admin can trigger reconcile
        const authHeader = request.headers.get('authorization')
        let sessionToken = authHeader?.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : undefined

        if (!sessionToken) {
            sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
        }

        const validation = await validateSessionToken(sessionToken, { touch: false })
        if (!validation.user || validation.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { windowMinutes = 15 } = await request.json().catch(() => ({ windowMinutes: 15 }))

        const supabase = getSupabaseAdmin()
        const stripe = getStripeInstance()

        // Находим зависшие pending-покупки (без фильтра по created_at — текущая схема)
        const { data: pending, error: qErr } = await supabase
            .from('purchases')
            .select('id, stripe_payment_intent_id, stripe_session_id, payment_status, amount_paid, currency, document_id, user_id, user_email, payment_method')
            .eq('payment_status', 'pending')
            .limit(100)

        if (qErr) {
            return NextResponse.json({ error: 'Query error', details: qErr.message }, { status: 500 })
        }

        const results: Array<{ id: string; prev: string; next?: string; reason?: string }> = []

        for (const p of pending || []) {
            let finalStatus: 'completed' | 'failed' | 'pending' | 'refunded' = 'pending'
            try {
                // Сверяемся со Stripe Payment Intent, если он сохранен
                if (p.stripe_payment_intent_id) {
                    const pi = await stripe.paymentIntents.retrieve(p.stripe_payment_intent_id)
                    switch (pi.status) {
                        case 'succeeded':
                            finalStatus = 'completed'
                            break
                        case 'requires_payment_method':
                        case 'requires_action':
                        case 'processing':
                        default:
                            finalStatus = 'pending'
                            break
                    }
                } else if (p.stripe_session_id) {
                    // As a fallback, check session via Checkout Sessions API if needed in future
                    finalStatus = 'pending'
                }

                if (finalStatus !== 'pending') {
                    const { error: upErr } = await supabase
                        .from('purchases')
                        .update({ payment_status: finalStatus, updated_at: new Date().toISOString() })
                        .eq('id', p.id)
                        .neq('payment_status', 'completed')

                    if (upErr) throw upErr

                    if (finalStatus === 'completed') {
                        // Продублируем логику вебхука: выдаем доступ
                        await syncCourseAccessByStatus(supabase, [p], 'completed', {
                            source: 'admin_reconcile',
                            metadata: {
                                window_minutes: windowMinutes,
                                reconcile: true,
                            },
                        })
                    } else if (finalStatus === 'failed' || finalStatus === 'refunded') {
                        await syncCourseAccessByStatus(supabase, [p], finalStatus, {
                            source: 'admin_reconcile',
                            reason: finalStatus === 'refunded' ? 'reconcile_refund' : 'reconcile_failed',
                            metadata: {
                                window_minutes: windowMinutes,
                                reconcile: true,
                            },
                        })
                    }
                }

                results.push({ id: p.id, prev: p.payment_status, next: finalStatus })
            } catch (e: any) {
                results.push({ id: p.id, prev: p.payment_status, reason: e?.message || 'error' })
            }
        }

        return NextResponse.json({ ok: true, checked: pending?.length || 0, results })
    } catch (error) {
        console.error('Reconcile error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
