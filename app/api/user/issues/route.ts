import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  getSessionErrorMessage,
  validateSessionToken
} from '@/lib/session'
import { posthog } from '@/lib/posthog'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const validation = await validateSessionToken(sessionToken, { supabase })

    if (!validation.session || !validation.user) {
      const response = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })
      if (sessionToken) clearSessionCookie(response)
      return response
    }

    const body = await request.json().catch(() => ({}))
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const context = typeof body?.context === 'object' && body.context ? body.context : {}
    const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim() : null

    if (!description || description.length < 10) {
      return NextResponse.json({ error: 'Опишите проблему подробнее (минимум 10 символов).' }, { status: 400 })
    }

    const sanitizedContext = Object.fromEntries(
      Object.entries(context).filter(([_, value]) => value !== undefined)
    )

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: validation.session.user_id,
        actor_email: validation.user.email,
        action: 'user_report_issue',
        target_table: 'support_issues',
        metadata: {
          subject: subject || 'Проблема пользователя',
          description,
          context: sanitizedContext,
          contactEmail,
          path: request.headers.get('referer') ?? null
        },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        user_agent: request.headers.get('user-agent') ?? null
      })

    if (error) {
      console.error('Support issue insert error:', error)
      return NextResponse.json({ error: 'Не удалось сохранить сообщение' }, { status: 500 })
    }

    posthog.capture({
      distinctId: validation.session.user_id,
      event: 'user_report_issue',
      properties: {
        subject: subject || 'Проблема пользователя',
        hasContact: Boolean(contactEmail),
        context: sanitizedContext
      }
    })

    const response = NextResponse.json({ success: true })
    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }
    return response
  } catch (error) {
    console.error('Support issue POST error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
