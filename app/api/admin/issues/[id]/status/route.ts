import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  SESSION_COOKIE_NAME,
  validateSessionToken,
  getSessionErrorMessage
} from '@/lib/session'
import { posthog } from '@/lib/posthog'

export const runtime = 'nodejs'

const ALLOWED_STATUS = new Set(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'])

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
      response: NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }
  }
  return { validation, response: null }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { validation, response } = await requireAdmin(request)
  if (!validation) return response!

  const resolvedParams = await params
  const issueId = resolvedParams.id
  if (!issueId) {
    return NextResponse.json({ error: 'Issue id required' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const nextStatus = typeof body?.status === 'string' ? body.status : null
    const assignee = body?.assignee ? String(body.assignee).trim() : undefined

    if (!nextStatus || !ALLOWED_STATUS.has(nextStatus)) {
      return NextResponse.json({ error: 'Некорректный статус' }, { status: 400 })
    }

    const closedAt = nextStatus === 'resolved' || nextStatus === 'closed'
      ? new Date().toISOString()
      : null

    const { data: issueData, error } = await supabase.rpc('issue_admin_set_status', {
      p_issue_id: issueId,
      p_status: nextStatus,
      p_assignee: assignee,
      p_closed_at: closedAt
    })

    const issue = Array.isArray(issueData) ? issueData[0] : issueData

    if (error || !issue) {
      console.error('Issue status update error:', error)
      return NextResponse.json({ error: 'Не удалось обновить статус' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      actor_id: validation.session?.user_id ?? validation.user?.id ?? null,
      actor_email: validation.user?.email ?? null,
      action: 'issue_status_changed',
      target_table: 'issue_reports',
      target_id: issueId,
      metadata: {
        status: nextStatus,
        assignee
      }
    })

    posthog.capture({
      distinctId: validation.session?.user_id || validation.user?.id,
      event: 'admin_issue_status_changed',
      properties: {
        issueId,
        status: nextStatus
      }
    })

    const { data: fullIssue, error: loadError } = await supabase
      .from('issue_reports')
      .select('*, issue_replies(*)')
      .eq('id', issueId)
      .maybeSingle()

    if (loadError) {
      console.warn('Issue reload error after status change:', loadError)
    }

    return NextResponse.json({ success: true, issue: fullIssue ?? issue })
  } catch (error) {
    console.error('Admin issue status error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
