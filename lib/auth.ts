import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE_NAME,
  validateSessionToken,
  getSessionErrorMessage
} from '@/lib/session'

interface RequireAdminSuccess {
  validation: Awaited<ReturnType<typeof validateSessionToken>> & {
    session: NonNullable<Awaited<ReturnType<typeof validateSessionToken>>['session']>
    user: NonNullable<Awaited<ReturnType<typeof validateSessionToken>>['user']>
  }
  response: null
}

interface RequireAdminFailure {
  validation: null
  response: NextResponse
}

export type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure

export async function requireAdmin(request: NextRequest): Promise<RequireAdminResult> {
  const authHeader = request.headers.get('authorization')
  let sessionToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined

  if (!sessionToken) {
    sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  }

  const validation = await validateSessionToken(sessionToken, { touch: false })

  if (!validation.session || !validation.user || validation.user.role !== 'admin') {
    const response = NextResponse.json({ error: getSessionErrorMessage('forbidden') }, { status: 403 })
    return { validation: null, response }
  }

  return { validation: validation as RequireAdminSuccess['validation'], response: null }
}
