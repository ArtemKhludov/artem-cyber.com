import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { userId, email, documentId, amountPaid = 0, currency = 'RUB', notes, useGracePeriod = false, gracePeriodMinutes = 30 } = await request.json()
        if (!documentId || (!userId && !email)) {
            return NextResponse.json({ error: 'userId or email and documentId are required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        let targetUserId = userId
        let targetEmail = email?.toLowerCase() || undefined

        if (!targetUserId) {
            const { data: userRow, error: userErr } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', email.toLowerCase())
                .maybeSingle()

            if (userErr || !userRow) {
                return NextResponse.json({ error: 'User not found for email' }, { status: 404 })
            }
            targetUserId = userRow.id
            targetEmail = userRow.email
        } else {
            const { data: userRow, error: userErr } = await supabase
                .from('users')
                .select('id, email')
                .eq('id', targetUserId)
                .maybeSingle()

            if (userErr || !userRow) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }
            targetEmail = userRow.email
        }

        if (!targetUserId || !targetEmail) {
            return NextResponse.json({ error: 'Unable to resolve user' }, { status: 400 })
        }

        // Try to find existing purchase for this email+document
        const { data: existing, error: findErr } = await supabase
            .from('purchases')
            .select('id, payment_status, payment_method, amount_paid, currency, user_id, user_email')
            .eq('user_id', targetUserId)
            .eq('document_id', documentId)
            .maybeSingle()

        if (findErr) {
            return NextResponse.json({ error: 'Query error', details: findErr.message }, { status: 500 })
        }

        if (existing) {
            if (existing.payment_status === 'completed') {
                return NextResponse.json({ success: true, message: 'Access already granted', purchase: existing })
            }
            const { data: updated, error: upErr } = await supabase
                .from('purchases')
                .update({
                    payment_status: 'completed',
                    payment_method: existing.payment_method || 'admin',
                    amount_paid: typeof existing.amount_paid === 'number' ? existing.amount_paid : amountPaid,
                    currency: existing.currency || currency,
                    updated_at: new Date().toISOString(),
                    user_id: existing.user_id || targetUserId,
                    user_email: existing.user_email || targetEmail,
                })
                .eq('id', existing.id)
                .select()
                .maybeSingle()

            if (upErr) {
                return NextResponse.json({ error: 'Update error', details: upErr.message }, { status: 500 })
            }
            const accessParams: Record<string, unknown> = {
                p_purchase_id: updated.id,
                p_actor_id: validation.session?.user_id || validation.user.id,
                p_actor_email: validation.user.email,
                p_source: 'admin_manual',
            }

            if (notes) {
                accessParams.p_metadata = { notes }
            }

            const accessResult = await supabase.rpc('grant_course_access_from_purchase', accessParams)

            if (accessResult.error) {
                return NextResponse.json({ error: 'Access sync error', details: accessResult.error.message }, { status: 500 })
            }

            return NextResponse.json({ success: true, purchase: updated, access: accessResult.data?.[0] ?? null })
        }

        // Create new purchase (support grace period)
        let inserted: any = null
        let insErr: any = null

        const gracePeriodUntil = useGracePeriod
            ? new Date(Date.now() + gracePeriodMinutes * 60 * 1000).toISOString()
            : null

        const purchaseStatus = useGracePeriod ? 'pending_verification' : 'completed'
        const paymentMethod = useGracePeriod ? 'grace_period' : 'admin'

        {
            const attempt = await supabase
                .from('purchases')
                .insert([
                    {
                        user_id: targetUserId,
                        user_email: targetEmail,
                        document_id: documentId,
                        payment_status: purchaseStatus,
                        payment_method: paymentMethod,
                        amount_paid: amountPaid,
                        currency,
                        grace_period_until: gracePeriodUntil,
                        grace_period_verified: !useGracePeriod,
                        verification_attempts: 0,
                    },
                ])
                .select()
                .maybeSingle()
            inserted = attempt.data
            insErr = attempt.error
        }

        if (insErr) {
            // Fallback for legacy column name 'amount'
            const retry = await supabase
                .from('purchases')
                .insert([
                    {
                        user_id: targetUserId,
                        user_email: targetEmail,
                        document_id: documentId,
                        payment_status: 'completed',
                        payment_method: 'admin',
                        amount: amountPaid,
                        currency,
                    } as any,
                ])
                .select()
                .maybeSingle()
            inserted = retry.data
            insErr = retry.error
        }

        if (insErr) {
            return NextResponse.json({ error: 'Insert error', details: insErr.message || String(insErr) }, { status: 500 })
        }

        const accessParams: Record<string, unknown> = {
            p_purchase_id: inserted.id,
            p_actor_id: validation.session?.user_id || validation.user.id,
            p_actor_email: validation.user.email,
            p_source: 'admin_manual',
        }

        if (notes) {
            accessParams.p_metadata = { notes }
        }

        const accessResult = await supabase.rpc('grant_course_access_from_purchase', accessParams)

        if (accessResult.error) {
            return NextResponse.json({ error: 'Access sync error', details: accessResult.error.message }, { status: 500 })
        }

        // If grace period is used, update access
        if (useGracePeriod && accessResult.data?.[0]) {
            await supabase
                .from('user_course_access')
                .update({
                    is_grace_period: true,
                    grace_period_until: gracePeriodUntil,
                    metadata: {
                        ...accessResult.data[0].metadata,
                        grace_period: true,
                        grace_period_minutes: gracePeriodMinutes,
                        admin_granted: true
                    }
                })
                .eq('id', accessResult.data[0].id)
        }

        return NextResponse.json({
            success: true,
            purchase: inserted,
            access: accessResult.data?.[0] ?? null,
            gracePeriod: useGracePeriod ? {
                enabled: true,
                until: gracePeriodUntil,
                minutes: gracePeriodMinutes
            } : null
        })
    } catch (error) {
        console.error('Admin grant access error:', error)
        const message = error instanceof Error ? error.message : 'Internal error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
