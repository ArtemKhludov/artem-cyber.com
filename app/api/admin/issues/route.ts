import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  SESSION_COOKIE_NAME,
  validateSessionToken,
  getSessionErrorMessage
} from '@/lib/session'

export const runtime = 'nodejs'

const parseListParam = (value: string | null) => {
  if (!value) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

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

export async function GET(request: NextRequest) {
  const { validation, response } = await requireAdmin(request)
  if (!validation) return response!

  try {
    const supabase = getSupabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 200)
    const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
    const offset = (page - 1) * limit

    const statusFilter = parseListParam(searchParams.get('status'))
    const typeFilter = parseListParam(searchParams.get('type'))
    const assignee = searchParams.get('assignee')?.trim() || null
    const q = searchParams.get('q')?.trim() || null
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('issue_reports')
      .select(`
        *,
        issue_replies(*),
        users!left(id, name, phone, telegram_username)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter.length > 0) {
      query = query.in('status', statusFilter)
    }

    if (typeFilter.length > 0) {
      query = query.in('type', typeFilter)
    }

    if (assignee) {
      query = query.eq('assignee', assignee)
    }

    if (from) {
      query = query.gte('created_at', from)
    }

    if (to) {
      query = query.lte('created_at', to)
    }

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,user_email.ilike.%${q}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Admin issues fetch error:', error)
      return NextResponse.json({ error: 'Не удалось загрузить обращения' }, { status: 500 })
    }

    // Обрабатываем данные пользователей
    const processedData = data?.map(issue => ({
      ...issue,
      user_name: issue.users?.name || null,
      user_phone: issue.users?.phone || null,
      user_telegram_username: issue.users?.telegram_username || null,
      users: undefined // Убираем объект users из ответа
    })) || []

    const { data: statusRows } = await supabase
      .from('issue_reports')
      .select('status')

    const counters = { open: 0, in_progress: 0, waiting_user: 0, resolved: 0, closed: 0 }
      ; (statusRows || []).forEach((row) => {
        const key = row.status as keyof typeof counters
        if (key in counters) counters[key] += 1
      })

    return NextResponse.json({
      success: true,
      issues: processedData,
      total: count ?? 0,
      page,
      limit,
      counters
    })
  } catch (error) {
    console.error('Admin issues GET error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
