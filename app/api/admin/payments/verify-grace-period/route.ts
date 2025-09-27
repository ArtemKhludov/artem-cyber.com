import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/session'
import Stripe from 'stripe'

async function requireAdmin(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        let sessionToken = authHeader?.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : undefined
        if (!sessionToken) {
            sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
        }

        const validation = await validateSessionToken(sessionToken, { touch: false })
        if (!validation.user || validation.user.role !== 'admin') {
            return { success: false, error: 'Forbidden', status: 403 }
        }

        return {
            success: true,
            userId: validation.session?.user_id || validation.user.id,
            userEmail: validation.user.email
        }
    } catch (error) {
        return { success: false, error: 'Unauthorized', status: 401 }
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
    try {
        // Проверяем права администратора
        const adminResult = await requireAdmin(request)
        if (!adminResult.success) {
            return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
        }

        const supabase = getSupabaseAdmin()

        // Находим все grace period покупки, которые нужно проверить
        const { data: gracePeriodPurchases, error: fetchError } = await supabase
            .from('purchases')
            .select(`
        id,
        stripe_payment_intent_id,
        user_id,
        user_email,
        product_name,
        amount_paid,
        currency,
        grace_period_until,
        verification_attempts,
        user_course_access!inner(
          id,
          document_id,
          is_grace_period,
          metadata
        )
      `)
            .eq('grace_period_verified', false)
            .not('grace_period_until', 'is', null)
            .lt('grace_period_until', new Date().toISOString()) // Время истекло
            .lt('verification_attempts', 3) // Максимум 3 попытки

        if (fetchError) {
            console.error('Ошибка получения grace period покупок:', fetchError)
            return NextResponse.json({ error: 'Ошибка получения данных' }, { status: 500 })
        }

        if (!gracePeriodPurchases || gracePeriodPurchases.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Нет grace period покупок для проверки',
                processed: 0,
                results: []
            })
        }

        const results = []

        for (const purchase of gracePeriodPurchases) {
            try {
                let realPaymentStatus = 'unknown'
                let shouldRevokeAccess = true

                // Если есть stripe_payment_intent_id, проверяем в Stripe
                if (purchase.stripe_payment_intent_id) {
                    try {
                        const paymentIntent = await stripe.paymentIntents.retrieve(
                            purchase.stripe_payment_intent_id
                        )
                        realPaymentStatus = paymentIntent.status

                        // Если платеж успешен, не отзываем доступ
                        if (paymentIntent.status === 'succeeded') {
                            shouldRevokeAccess = false

                            // Обновляем статус покупки
                            await supabase
                                .from('purchases')
                                .update({
                                    status: 'completed',
                                    grace_period_verified: true,
                                    verification_attempts: (purchase.verification_attempts || 0) + 1
                                })
                                .eq('id', purchase.id)

                            // Обновляем доступ - делаем его постоянным
                            await supabase
                                .from('user_course_access')
                                .update({
                                    is_grace_period: false,
                                    grace_period_until: null,
                                    metadata: {
                                        ...(purchase.user_course_access[0]?.metadata || {}),
                                        verified_payment: true,
                                        verified_at: new Date().toISOString(),
                                        stripe_payment_intent_id: purchase.stripe_payment_intent_id
                                    }
                                })
                                .eq('id', purchase.user_course_access[0].id)

                        }
                    } catch (stripeError) {
                        console.error(`Stripe error for payment ${purchase.stripe_payment_intent_id}:`, stripeError)
                        realPaymentStatus = 'stripe_error'
                    }
                } else {
                    // Нет Stripe ID - вероятно, это ручная выдача доступа
                    realPaymentStatus = 'no_payment_method'
                    shouldRevokeAccess = true
                }

                // Если нужно отозвать доступ
                if (shouldRevokeAccess) {
                    // Обновляем статус покупки
                    await supabase
                        .from('purchases')
                        .update({
                            status: 'failed',
                            grace_period_verified: true,
                            verification_attempts: (purchase.verification_attempts || 0) + 1
                        })
                        .eq('id', purchase.id)

                    // Отзываем доступ
                    await supabase
                        .from('user_course_access')
                        .update({
                            is_active: false,
                            is_grace_period: false,
                            grace_period_until: null,
                            revoked_at: new Date().toISOString(),
                            metadata: {
                                ...purchase.user_course_access[0]?.metadata,
                                revoked_reason: 'grace_period_expired_no_payment',
                                revoked_at: new Date().toISOString(),
                                verification_status: realPaymentStatus
                            }
                        })
                        .eq('id', purchase.user_course_access[0].id)

                    // Логируем отзыв доступа
                    await supabase.from('audit_logs').insert({
                        user_id: null, // Системное действие
                        action: 'revoke_access_grace_period_expired',
                        target_type: 'user_course_access',
                        target_id: purchase.user_course_access[0].id,
                        metadata: {
                            target_user_id: purchase.user_id,
                            purchase_id: purchase.id,
                            verification_status: realPaymentStatus,
                            grace_period_until: purchase.grace_period_until
                        }
                    })
                }

                results.push({
                    purchaseId: purchase.id,
                    userId: purchase.user_id,
                    userEmail: purchase.user_email,
                    productName: purchase.product_name,
                    realPaymentStatus,
                    shouldRevokeAccess,
                    gracePeriodUntil: purchase.grace_period_until,
                    verificationAttempts: (purchase.verification_attempts || 0) + 1
                })

            } catch (error) {
                console.error(`Ошибка обработки покупки ${purchase.id}:`, error)

                // Увеличиваем счетчик попыток
                await supabase
                    .from('purchases')
                    .update({
                        verification_attempts: (purchase.verification_attempts || 0) + 1
                    })
                    .eq('id', purchase.id)

                results.push({
                    purchaseId: purchase.id,
                    userId: purchase.user_id,
                    userEmail: purchase.user_email,
                    productName: purchase.product_name,
                    realPaymentStatus: 'processing_error',
                    shouldRevokeAccess: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        }

        return NextResponse.json({
            success: true,
            message: `Обработано ${results.length} grace period покупок`,
            processed: results.length,
            results
        })

    } catch (error) {
        console.error('Verify grace period error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
