import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = getSupabaseAdmin()
    try {
      await supabase.from('audit_logs').insert([
        {
          action: 'client_error',
          metadata: body,
        } as any,
      ])
    } catch {
      // ignore
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 200 })
  }
}


