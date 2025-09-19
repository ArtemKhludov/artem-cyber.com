import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const purchaseId = searchParams.get('id')
        if (!purchaseId) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        }
        const supabase = getSupabaseAdmin()

        const { data, error } = await supabase
            .from('audit_logs')
            .select('id, action, created_at, actor_email, metadata')
            .eq('target_table', 'purchases')
            .eq('target_id', purchaseId)
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: 'Query error', details: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        console.error('Audit purchase error:', error)
        const message = error instanceof Error ? error.message : 'Internal error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}



