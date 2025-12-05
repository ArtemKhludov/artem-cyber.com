import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import { getSupabaseAdmin } from './supabase'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

const DEFAULT_IDLE_MINUTES = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? '30')
const DEFAULT_ABSOLUTE_DAYS = Number(process.env.SESSION_ABSOLUTE_LIFETIME_DAYS ?? '7')
const REMEMBER_IDLE_MINUTES = Number(process.env.SESSION_REMEMBER_IDLE_MINUTES ?? String(DEFAULT_IDLE_MINUTES))
const REMEMBER_ABSOLUTE_DAYS = Number(process.env.SESSION_REMEMBER_LIFETIME_DAYS ?? String(DEFAULT_ABSOLUTE_DAYS))
const ACTIVITY_UPDATE_MINUTES = Number(process.env.SESSION_ACTIVITY_UPDATE_MINUTES ?? '5')

export const SESSION_COOKIE_NAME = 'session_token'

const DEFAULT_ACTIVITY_THRESHOLD_MS = ACTIVITY_UPDATE_MINUTES * MINUTE_MS

export type SessionInvalidationReason = 'missing' | 'not_found' | 'revoked' | 'expired' | 'inactive'

export interface SessionUser {
  id: string
  email: string
  name: string
  role?: string
  created_at?: string
}

export interface SessionRecord {
  session_token: string
  user_id: string
  expires_at: string
  last_activity: string | null
  revoked_at: string | null
  created_at: string | null
  remember_me: boolean | null
  ip_address: string | null
  user_agent: string | null
  csrf_secret: string | null
  users: SessionUser | null
}

export interface SessionValidationResult {
  session?: SessionRecord
  user?: SessionUser
  reason?: SessionInvalidationReason
  cookieMaxAgeSeconds?: number
  shouldRefreshCookie?: boolean
  sessionExpiresAt?: string
}

interface ValidateOptions {
  supabase?: SupabaseClient
  now?: Date
  touch?: boolean
  activityThresholdMs?: number
}

interface SessionDurations {
  idleMs: number
  absoluteMs: number
}

function getSupabaseClient(client?: SupabaseClient) {
  return client ?? getSupabaseAdmin()
}

export function getSessionDurations(remember?: boolean | null): SessionDurations {
  const idleMinutes = remember ? REMEMBER_IDLE_MINUTES : DEFAULT_IDLE_MINUTES
  const absoluteDays = remember ? REMEMBER_ABSOLUTE_DAYS : DEFAULT_ABSOLUTE_DAYS

  return {
    idleMs: Math.max(MINUTE_MS, idleMinutes * MINUTE_MS),
    absoluteMs: Math.max(DAY_MS, absoluteDays * DAY_MS),
  }
}

function getSessionTimeBounds(session: SessionRecord, now: Date) {
  const durations = getSessionDurations(!!session.remember_me)
  const expiresAt = new Date(session.expires_at)
  const lastActivity = session.last_activity ? new Date(session.last_activity) : undefined
  const createdAt = session.created_at ? new Date(session.created_at) : undefined
  const createdMs = createdAt?.getTime() ?? now.getTime()
  const absoluteExpiryMs = createdMs + durations.absoluteMs

  return {
    expiresAt,
    lastActivity,
    createdAt,
    absoluteExpiryMs,
    durations,
  }
}

export function buildSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.max(0, maxAgeSeconds),
  }
}

export function buildExpiredSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}

async function markSessionRevoked(
  sessionToken: string,
  supabase: SupabaseClient
) {
  await supabase
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq('session_token', sessionToken)
}

export async function revokeSessionToken(
  sessionToken: string,
  options: { supabase?: SupabaseClient } = {}
) {
  if (!sessionToken) return
  const supabase = getSupabaseClient(options.supabase)
  await markSessionRevoked(sessionToken, supabase)
}

export async function revokeUserSessions(
  userId: string,
  options: { supabase?: SupabaseClient; excludeToken?: string } = {}
) {
  const { supabase: providedClient, excludeToken } = options
  const supabase = getSupabaseClient(providedClient)
  const query = supabase
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (excludeToken) {
    query.neq('session_token', excludeToken)
  }

  await query
}

export async function validateSessionToken(
  sessionToken: string | undefined,
  options: ValidateOptions = {}
): Promise<SessionValidationResult> {
  const {
    supabase: providedSupabase,
    now = new Date(),
    touch = true,
    activityThresholdMs = DEFAULT_ACTIVITY_THRESHOLD_MS,
  } = options

  if (!sessionToken) {
    console.log('🔍 validateSessionToken: No session token provided')
    return { reason: 'missing' }
  }

  console.log(`🔍 validateSessionToken: Looking for session token: ${sessionToken}`)

  const supabase = getSupabaseClient(providedSupabase)

  const { data: sessionRaw, error } = await supabase
    .from('user_sessions')
    .select(
      `session_token, user_id, expires_at, last_activity, revoked_at, created_at, remember_me, ip_address, user_agent, csrf_secret,
       users (id, email, name, role, created_at)`
    )
    .eq('session_token', sessionToken)
    .maybeSingle()

  if (error) {
    console.log(`❌ validateSessionToken: Database error:`, error)
    return { reason: 'not_found' }
  }

  if (!sessionRaw) {
    console.log(`❌ validateSessionToken: Session not found in database`)
    return { reason: 'not_found' }
  }

  console.log(`✅ validateSessionToken: Session found for user: ${(sessionRaw.users as any)?.email || 'unknown'}`)

  const session = {
    ...sessionRaw,
    users: Array.isArray(sessionRaw.users)
      ? (sessionRaw.users[0] ?? null)
      : sessionRaw.users ?? null,
  } as SessionRecord

  if (session.revoked_at) {
    return { reason: 'revoked' }
  }

  const { expiresAt, lastActivity, createdAt, absoluteExpiryMs, durations } = getSessionTimeBounds(session, now)
  const nowMs = now.getTime()

  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= nowMs) {
    await markSessionRevoked(sessionToken, supabase)
    return { reason: 'expired' }
  }

  if (absoluteExpiryMs <= nowMs) {
    await markSessionRevoked(sessionToken, supabase)
    return { reason: 'expired' }
  }

  const activityAnchor = lastActivity ?? createdAt
  if (activityAnchor && nowMs - activityAnchor.getTime() > durations.idleMs) {
    await markSessionRevoked(sessionToken, supabase)
    return { reason: 'inactive' }
  }

  let shouldRefreshCookie = false
  const updates: Partial<Pick<SessionRecord, 'last_activity' | 'expires_at'>> = {}

  if (touch) {
    const thresholdMs = Math.max(activityThresholdMs, 0)
    const lastActivityMs = (lastActivity ?? createdAt ?? now).getTime()
    const shouldUpdateActivity = nowMs - lastActivityMs >= thresholdMs

    if (shouldUpdateActivity) {
      const nextIdleExpiryMs = Math.min(absoluteExpiryMs, nowMs + durations.idleMs)
      updates.last_activity = now.toISOString()
      updates.expires_at = new Date(nextIdleExpiryMs).toISOString()
      shouldRefreshCookie = true
    }
  }

  if (Object.keys(updates).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from('user_sessions')
      .update(updates)
      .eq('session_token', sessionToken)
      .select('expires_at, last_activity')
      .maybeSingle()

    if (!updateError && updated) {
      session.expires_at = updated.expires_at
      session.last_activity = updated.last_activity
    }
  }

  const refreshedExpiresAt = new Date(session.expires_at)
  const expiresAtMs = refreshedExpiresAt.getTime()
  const cookieMaxAgeMs = Math.max(0, Math.min(durations.idleMs, expiresAtMs - nowMs))
  const cookieMaxAgeSeconds = Math.floor(cookieMaxAgeMs / 1000)

  if (!shouldRefreshCookie && cookieMaxAgeMs > 0) {
    shouldRefreshCookie = cookieMaxAgeMs < durations.idleMs / 2
  }

  if (cookieMaxAgeSeconds <= 0) {
    await markSessionRevoked(sessionToken, supabase)
    return { reason: 'expired' }
  }

  return {
    session,
    user: session.users ?? undefined,
    cookieMaxAgeSeconds,
    shouldRefreshCookie,
    sessionExpiresAt: refreshedExpiresAt.toISOString(),
  }
}

export function getSessionErrorMessage(reason?: SessionInvalidationReason) {
  switch (reason) {
    case 'inactive':
      return 'Session expired due to inactivity'
    case 'expired':
      return 'Session expired'
    case 'revoked':
      return 'Session revoked'
    default:
      return 'Authorization required'
  }
}

export function attachSessionCookie<T extends NextResponse>(
  response: T,
  sessionToken: string,
  maxAgeSeconds: number
): T {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, buildSessionCookieOptions(maxAgeSeconds))
  return response
}

export function clearSessionCookie<T extends NextResponse>(response: T): T {
  response.cookies.set(SESSION_COOKIE_NAME, '', buildExpiredSessionCookieOptions())
  return response
}
