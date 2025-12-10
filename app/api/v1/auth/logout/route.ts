import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyRefreshToken } from '@/lib/jwt'
import { requireAuth } from '@/lib/api-auth'
import { logInfo } from '@/lib/logger'

/**
 * Logout endpoint - revokes refresh token
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from body
    const body = await request.json().catch(() => ({}))
    const { refreshToken } = body

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken)
        const supabase = getSupabaseAdmin()

        // Revoke refresh token
        await supabase
          .from('refresh_tokens')
          .update({ revoked: true, revoked_at: new Date().toISOString() })
          .eq('token', refreshToken)

        logInfo('Refresh token revoked', { userId: payload.userId })
      } catch (error) {
        // Invalid token - ignore
      }
    }

    // Also try to revoke session if present (web clients)
    const auth = await requireAuth(request)
    if (auth.success) {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('session_token', auth.context.session.session_token)
        .is('revoked_at', null)

      logInfo('Session revoked', { userId: auth.context.user.id })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

