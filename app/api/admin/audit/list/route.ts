import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()
        const { searchParams } = new URL(request.url)
        const actor = searchParams.get('actor')
        const action = searchParams.get('action')
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

        let query = supabase
            .from('audit_logs')
            .select('id, created_at, action, actor_email, target_table, target_id, metadata')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (actor) query = query.ilike('actor_email', `%${actor}%`)
        if (action) query = query.eq('action', action)
        if (from) query = query.gte('created_at', from)
        if (to) query = query.lte('created_at', to)

        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, data: data || [] })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
    }
}


