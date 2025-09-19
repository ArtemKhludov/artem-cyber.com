import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

function toDateKey(iso: string): string {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const windowDays = Math.max(1, Math.min(180, Number(searchParams.get('windowDays') || 30)))
        const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
        const sinceIso = since.toISOString()

        const supabase = getSupabaseAdmin()

        // Load raw data in the window and aggregate in code (window limited)
        const [{ data: purchases }, { data: accesses }, { data: reqs }] = await Promise.all([
            supabase
                .from('purchases')
                .select('id, document_id, user_id, user_email, payment_status, amount_paid, currency, stripe_payment_intent_id, created_at, updated_at')
                .gte('created_at', sinceIso),
            supabase
                .from('user_course_access')
                .select('id, user_id, document_id, granted_at, revoked_at')
                .or(`granted_at.gte.${sinceIso},revoked_at.gte.${sinceIso}`),
            supabase
                .from('purchase_requests')
                .select('id, created_at')
                .gte('created_at', sinceIso),
        ])

        const purchasesSafe = purchases || []
        const accessesSafe = accesses || []
        const reqsSafe = reqs || []

        // Revenue/refunds by day
        const revenueByDay: Record<string, number> = {}
        const refundsByDay: Record<string, number> = {}
        for (const p of purchasesSafe) {
            const day = toDateKey(p.created_at as string)
            const amount = Number((p as any).amount_paid || 0)
            if ((p as any).payment_status === 'completed') {
                revenueByDay[day] = (revenueByDay[day] || 0) + amount
            } else if ((p as any).payment_status === 'refunded') {
                refundsByDay[day] = (refundsByDay[day] || 0) + amount
            }
        }

        // Access trends by day
        const accessGrantedByDay: Record<string, number> = {}
        const accessRevokedByDay: Record<string, number> = {}
        for (const a of accessesSafe) {
            if ((a as any).granted_at) {
                const day = toDateKey((a as any).granted_at)
                accessGrantedByDay[day] = (accessGrantedByDay[day] || 0) + 1
            }
            if ((a as any).revoked_at) {
                const day = toDateKey((a as any).revoked_at)
                accessRevokedByDay[day] = (accessRevokedByDay[day] || 0) + 1
            }
        }

        // Funnel (window)
        const funnel = {
            started: reqsSafe.length,
            paid: purchasesSafe.filter(p => (p as any).payment_status === 'completed').length,
            access: accessesSafe.filter(a => !(a as any).revoked_at && new Date((a as any).granted_at) >= since).length,
        }

        // Top courses by revenue and active accesses
        const revenueByCourse: Record<string, number> = {}
        const activeAccessByCourse: Record<string, number> = {}
        for (const p of purchasesSafe) {
            if ((p as any).payment_status === 'completed') {
                revenueByCourse[(p as any).document_id] = (revenueByCourse[(p as any).document_id] || 0) + Number((p as any).amount_paid || 0)
            }
        }
        for (const a of accessesSafe) {
            if (!(a as any).revoked_at) {
                activeAccessByCourse[(a as any).document_id] = (activeAccessByCourse[(a as any).document_id] || 0) + 1
            }
        }
        const topRevenueCourses = Object.entries(revenueByCourse)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([document_id, amount]) => ({ document_id, amount }))
        const topAccessCourses = Object.entries(activeAccessByCourse)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([document_id, count]) => ({ document_id, count }))

        // Anomalies
        const now = Date.now()
        const stuckPending = purchasesSafe.filter(p => (p as any).payment_status === 'pending' && new Date((p as any).created_at).getTime() < now - 24 * 60 * 60 * 1000).length
        // completed without active access
        const accessKey = new Set(accessesSafe.filter(a => !(a as any).revoked_at).map(a => `${(a as any).user_id}:${(a as any).document_id}`))
        const completedNoAccess = purchasesSafe.filter(p => (p as any).payment_status === 'completed' && !accessKey.has(`${(p as any).user_id}:${(p as any).document_id}`)).length

        // Normalize daily arrays for window
        const days: string[] = []
        for (let i = 0; i < windowDays; i++) {
            const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
            days.push(toDateKey(d.toISOString()))
        }
        const series = (src: Record<string, number>) => days.map(d => ({ day: d, value: src[d] || 0 }))

        return NextResponse.json({
            success: true,
            windowDays,
            revenueSeries: series(revenueByDay),
            refundsSeries: series(refundsByDay),
            accessGrantedSeries: series(accessGrantedByDay),
            accessRevokedSeries: series(accessRevokedByDay),
            funnel,
            topRevenueCourses,
            topAccessCourses,
            anomalies: {
                stuckPending,
                completedNoAccess,
            }
        })
    } catch (error) {
        console.error('Metrics error:', error)
        const message = error instanceof Error ? error.message : 'Internal error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}



