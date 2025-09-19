import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()
        // Best-effort: последние события grant/revoke из audit_logs
        const { data, error } = await supabase
            .from('audit_logs')
            .select('id, action, created_at, actor_email, target_table, target_id')
            .or('action.eq.grant,action.eq.revoke,action.eq.grant_course_access,action.eq.revoke_course_access')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            return NextResponse.json({ error: 'Query error', details: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        console.error('Audit recent error:', error)
        const message = error instanceof Error ? error.message : 'Internal error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}



