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
import { notifyIssueTelegram } from '@/lib/notify'

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set(['access', 'payment', 'content', 'bug', 'other'])
const ALLOWED_SEVERITIES = new Set(['low', 'normal', 'high', 'urgent'])

const parseString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback

const parseOptionalString = (value: unknown): string | null => {
  const parsed = parseString(value)
  return parsed.length > 0 ? parsed : null
}

export async function GET(request: NextRequest) {
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

    // Получаем обращения пользователя с ответами
    const { data: issues, error: issuesError } = await supabase
      .from('issue_reports')
      .select(`
        id,
        title,
        description,
        type,
        severity,
        status,
        created_at,
        updated_at,
        first_reply_at,
        closed_at,
        issue_replies (
          id,
          message,
          author_email,
          created_at
        )
      `)
      .eq('user_id', validation.session.user_id)
      .order('created_at', { ascending: false })

    if (issuesError) {
      console.error('Issues fetch error:', issuesError)
      return NextResponse.json({ error: 'Не удалось загрузить обращения' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true, issues })
    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }
    return response

  } catch (error) {
    console.error('Issues GET error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

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
    const rawSubject = parseString(body?.subject)
    const subject = rawSubject || 'Сообщение пользователя'
    const description = parseString(body?.description)
    const type = ALLOWED_TYPES.has(body?.type) ? body.type : 'other'
    const severity = ALLOWED_SEVERITIES.has(body?.severity) ? body.severity : 'normal'
    const purchaseId = parseOptionalString(body?.purchaseId)
    const documentId = parseOptionalString(body?.documentId)
    const url = parseOptionalString(body?.url)
    const context = typeof body?.context === 'object' && body.context ? body.context : {}

    // Извлекаем контактные данные из context
    const userPhone = context?.phone || ''
    const userTelegram = context?.telegram || ''
    const wantTelegramNotifications = Boolean(context?.wantTelegramNotifications)
    const wantEmailNotifications = Boolean(context?.wantEmailNotifications ?? true)

    if (description.length < 10) {
      return NextResponse.json({ error: 'Опишите проблему подробнее (минимум 10 символов).' }, { status: 400 })
    }

    const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentIssues, error: recentError } = await supabase
      .from('issue_reports')
      .select('id')
      .eq('user_id', validation.session.user_id)
      .gte('created_at', windowStart)

    if (recentError) {
      console.error('Issue rate-limit check failed:', recentError)
      return NextResponse.json({ error: 'Не удалось создать обращение' }, { status: 500 })
    }

    if ((recentIssues?.length ?? 0) >= 3) {
      return NextResponse.json({ error: 'Слишком много обращений. Попробуйте через несколько минут.' }, { status: 429 })
    }

    const sanitizedContext = Object.fromEntries(
      Object.entries(context).filter(([_, value]) => value !== undefined)
    )

    // Обновляем контактные данные пользователя
    if (userPhone || userTelegram) {
      const updateData: Record<string, any> = {}
      if (userPhone) updateData.phone = userPhone
      if (userTelegram) updateData.telegram_username = userTelegram
      if (wantTelegramNotifications !== undefined) updateData.notify_telegram_enabled = wantTelegramNotifications
      if (wantEmailNotifications !== undefined) updateData.notify_email_enabled = wantEmailNotifications

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', validation.session.user_id)
    }

    const insertPayload: Record<string, unknown> = {
      user_id: validation.session.user_id,
      user_email: validation.user.email,
      purchase_id: purchaseId,
      document_id: documentId,
      type,
      severity,
      title: subject,
      description,
      context_json: sanitizedContext,
      url
    }

    const { data: issue, error: insertError } = await supabase
      .from('issue_reports')
      .insert([insertPayload])
      .select('*, issue_replies(*)')
      .maybeSingle()

    if (insertError) {
      console.error('Issue insert error:', insertError)
      return NextResponse.json({ error: 'Не удалось сохранить обращение' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      actor_id: validation.session.user_id,
      actor_email: validation.user.email,
      action: 'issue_created',
      target_table: 'issue_reports',
      target_id: issue?.id ?? null,
      metadata: {
        type,
        severity,
        title: subject,
        purchaseId,
        documentId,
        url,
        context: sanitizedContext
      },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: request.headers.get('user-agent') ?? null
    })

    posthog.capture({
      distinctId: validation.session.user_id,
      event: 'user_issue_created',
      properties: {
        severity,
        type,
        hasPurchase: Boolean(purchaseId),
        hasDocument: Boolean(documentId)
      }
    })

    // Fire-and-forget issue-specific Telegram notification (env-gated)
    if (issue?.id) {
      notifyIssueTelegram({
        issueId: issue.id,
        userId: validation.session.user_id,
        userEmail: validation.user.email,
        title: subject,
        description,
        type,
        severity,
        purchaseId,
        documentId,
        url
      }).catch((err) => console.error('notifyIssueTelegram failed:', err))
    }

    const response = NextResponse.json({ success: true, issue })
    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }
    return response

  } catch (error) {
    console.error('Issues POST error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}