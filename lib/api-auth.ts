import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken, SESSION_COOKIE_NAME } from './session'

export interface AuthContext {
  user: {
    id: string
    email: string
    name: string
    role?: string
  }
  session: {
    session_token: string
    user_id: string
  }
}

/**
 * Require authentication for API routes
 * Supports both Bearer token (mobile) and cookie (web) authentication
 */
export async function requireAuth(request: NextRequest): Promise<
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse }
> {
  // Get token from Authorization header (mobile) or cookie (web)
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const validation = await validateSessionToken(token)

  if (!validation.session || !validation.user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }
  }

  return {
    success: true,
    context: {
      user: validation.user,
      session: validation.session
    }
  }
}

/**
 * Require admin role for API routes
 */
export async function requireAdmin(request: NextRequest): Promise<
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse }
> {
  const auth = await requireAuth(request)
  
  if (!auth.success) {
    return auth
  }

  if (auth.context.user.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
  }

  return auth
}

