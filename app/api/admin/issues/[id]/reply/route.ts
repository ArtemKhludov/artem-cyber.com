import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  SESSION_COOKIE_NAME,
  validateSessionToken,
  getSessionErrorMessage
} from '@/lib/session'
import { posthog } from '@/lib/posthog'
import { sendEmail } from '@/lib/notify'

export const runtime = 'nodejs'

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  let sessionToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined
  if (!sessionToken) {
    sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  }

  const validation = await validateSessionToken(sessionToken, { touch: false })
  if (!validation.session || !validation.user || validation.user.role !== 'admin') {
    return {
      validation: null,
      response: NextResponse.json({ error: getSessionErrorMessage('forbidden') }, { status: 403 })
    }
  }
  return { validation, response: null }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { validation, response } = await requireAdmin(request)
  if (!validation) return response!

  const issueId = params.id
  if (!issueId) {
    return NextResponse.json({ error: 'Issue id required' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const attachments = Array.isArray(body?.attachments) ? body.attachments : []
    const nextStatus = body?.status
    const assignee = body?.assignee ? String(body.assignee).trim() : undefined

    if (message.length < 3) {
      return NextResponse.json({ error: 'Сообщение должно содержать минимум 3 символа' }, { status: 400 })
    }

    const { data: issue, error: issueError } = await supabase
      .from('issue_reports')
      .select('*')
      .eq('id', issueId)
      .maybeSingle()

    if (issueError || !issue) {
      return NextResponse.json({ error: 'Обращение не найдено' }, { status: 404 })
    }

    const { data: replyData, error: replyError } = await supabase.rpc('issue_admin_add_reply', {
      p_issue_id: issueId,
      p_message: message,
      p_author_id: validation.session.user_id,
      p_author_email: validation.user.email,
      p_attachments: attachments
    })

    if (replyError) {
      console.error('Issue reply insert error:', replyError)
      return NextResponse.json({ error: 'Не удалось добавить ответ' }, { status: 500 })
    }

    const reply = Array.isArray(replyData) ? replyData[0] : replyData

    let updatedIssue = issue
    const statusToApply = nextStatus || 'in_progress'
    const { data: updatedData, error: statusError } = await supabase.rpc('issue_admin_set_status', {
      p_issue_id: issueId,
      p_status: statusToApply,
      p_assignee: assignee ?? validation.user.email,
      p_first_reply: issue.first_reply_at ? null : new Date().toISOString()
    })

    if (statusError) {
      console.error('Issue status update error:', statusError)
    } else if (updatedData) {
      updatedIssue = Array.isArray(updatedData) ? updatedData[0] : updatedData
    }

    await supabase.from('audit_logs').insert({
      actor_id: validation.session.user_id,
      actor_email: validation.user.email,
      action: 'issue_replied',
      target_table: 'issue_reports',
      target_id: issueId,
      metadata: {
        status: statusToApply,
        assignee: assignee ?? validation.user.email
      }
    })

    posthog.capture({
      distinctId: validation.session.user_id,
      event: 'admin_issue_reply',
      properties: {
        issueId,
        status: statusToApply
      }
    })

    const { data: fullIssue, error: loadError } = await supabase
      .from('issue_reports')
      .select('*, issue_replies(*)')
      .eq('id', issueId)
      .maybeSingle()

    if (loadError) {
      console.warn('Issue reload error after reply:', loadError)
    }

    const mergedIssue = fullIssue ?? updatedIssue

    // Отправляем email пользователю с ответом
    try {
      const emailResult = await sendEmail({
        to: issue.user_email,
        subject: `Ответ на ваше обращение: ${issue.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Ответ на ваше обращение</h2>
            <p>Здравствуйте!</p>
            <p>Мы получили ваше обращение <strong>"${issue.title}"</strong> и готовы ответить.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Наш ответ:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            
            <p>Статус обращения: <strong>${statusToApply === 'in_progress' ? 'В работе' : statusToApply}</strong></p>
            
            <p>Если у вас есть дополнительные вопросы, пожалуйста, ответьте на это письмо или создайте новое обращение в личном кабинете.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              Это автоматическое сообщение. Пожалуйста, не отвечайте на него напрямую, если это не требуется.
            </p>
          </div>
        `,
        text: `
Ответ на ваше обращение

Здравствуйте!

Мы получили ваше обращение "${issue.title}" и готовы ответить.

Наш ответ:
${message}

Статус обращения: ${statusToApply === 'in_progress' ? 'В работе' : statusToApply}

Если у вас есть дополнительные вопросы, пожалуйста, ответьте на это письмо или создайте новое обращение в личном кабинете.

---
Это автоматическое сообщение.
        `
      })

      if (!emailResult.ok) {
        console.warn('Failed to send email notification:', emailResult.reason)
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError)
    }

    return NextResponse.json({ success: true, reply, issue: mergedIssue })
  } catch (error) {
    console.error('Admin issue reply error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
