import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateJWT, verifyRefreshToken } from '@/lib/jwt'
import { validateRequest, schemas } from '@/lib/validate-request'
import { logError, logInfo, logWarn } from '@/lib/logger'

/**
 * Refresh access token using refresh token
 */
export const POST = validateRequest(schemas.refreshToken, async (request: NextRequest, data) => {
  try {
    const { refreshToken } = data

    // Verify refresh token
    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    if (payload.type !== 'refresh') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Check if refresh token exists in database and is not revoked
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('refresh_tokens')
      .select('*, users(id, email, name, role)')
      .eq('token', refreshToken)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenRecord) {
      logWarn('Refresh token not found or expired', { userId: payload.userId })
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    // Verify user still exists and is active
    const user = tokenRecord.users as any
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Generate new access token
    let newAccessToken: string
    try {
      newAccessToken = generateJWT(user.id, user.email)
    } catch (error) {
      logError('JWT generation failed', error as Error)
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 500 }
      )
    }

    logInfo('Token refreshed', { userId: user.id })

    return NextResponse.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    })
  } catch (error) {
    logError('Token refresh error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

