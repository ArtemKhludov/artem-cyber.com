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

    const { userId, documentId, reason, notes } = await request.json()

    if (!userId || !documentId) {
      return NextResponse.json({ error: 'userId and documentId are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle()

    if (userErr || !userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const rpcParams: Record<string, unknown> = {
      p_user_id: userId,
      p_document_id: documentId,
      p_actor_id: validation.session?.user_id || validation.user.id,
      p_actor_email: validation.user.email,
      p_source: 'admin_manual',
    }

    if (reason) rpcParams.p_reason = reason
    if (notes) rpcParams.p_metadata = { notes }

    const { data, error } = await supabase.rpc('revoke_course_access', rpcParams)

    if (error) {
      return NextResponse.json({ error: 'Access revoke error', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, access: data?.[0] ?? null })
  } catch (error) {
    console.error('Admin revoke access error:', error)
    const message = error instanceof Error ? error.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
