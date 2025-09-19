import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { SessionValidationResult } from '@/lib/session'
import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  getSessionErrorMessage,
  validateSessionToken
} from '@/lib/session'
import { verifyRequestOrigin } from '@/lib/security'

interface AdminContext {
  supabase: ReturnType<typeof getSupabaseAdmin>
  validation: SessionValidationResult
}

async function resolveAdminContext(): Promise<AdminContext | NextResponse> {
  const supabase = getSupabaseAdmin()
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const validation = await validateSessionToken(sessionToken, { supabase })

  if (!validation.session || !validation.user) {
    const response = NextResponse.json({ error: getSessionErrorMessage(validation.reason) }, { status: 401 })

    if (sessionToken) {
      clearSessionCookie(response)
    }

    return response
  }

  if (validation.user.role !== 'admin') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  return { supabase, validation }
}

function maybeAttachSessionCookie(response: NextResponse, validation: SessionValidationResult) {
  if (validation.session && validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
    attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveAdminContext()
    if (context instanceof NextResponse) {
      return context
    }

    const { supabase, validation } = context

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Ошибка получения документов' }, { status: 500 })
    }

    const response = NextResponse.json({ documents })
    maybeAttachSessionCookie(response, validation)

    return response
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
    try {
        try {
            verifyRequestOrigin(request)
        } catch (error) {
            if (error instanceof Error) {
                return NextResponse.json({ error: error.message }, { status: 403 })
            }
            return NextResponse.json({ error: 'Запрос отклонен' }, { status: 403 })
        }

        const context = await resolveAdminContext()
        if (context instanceof NextResponse) {
            return context
        }

    const { supabase, validation } = context

    const body = await request.json()
    const {
      title,
      description,
      course_description,
      main_pdf_title,
      main_pdf_description,
      price_rub,
      file_url,
      cover_url,
      page_count,
      course_type,
      video_preview_url,
      course_duration_minutes,
      video_count,
      has_workbook,
      has_audio,
      has_videos
    } = body

    if (!title || !price_rub || !file_url) {
      return NextResponse.json({ error: 'Необходимы поля: title, price_rub, file_url' }, { status: 400 })
    }

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        title,
        description: description || '',
        course_description: course_description || '',
        main_pdf_title: main_pdf_title || '',
        main_pdf_description: main_pdf_description || '',
        price_rub: parseInt(price_rub),
        price: parseInt(price_rub),
        file_url,
        cover_url: cover_url || '',
        course_type: course_type || 'mini_course',
        video_preview_url: video_preview_url || '',
        course_duration_minutes: course_duration_minutes ? parseInt(course_duration_minutes) : null,
        video_count: video_count ? parseInt(video_count) : null,
        has_workbook: has_workbook || false,
        has_audio: has_audio || false,
        has_videos: has_videos || false,
        page_count: page_count ? parseInt(page_count) : null
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error creating document:', error)
      return NextResponse.json({ error: 'Ошибка создания документа' }, { status: 500 })
    }

    try {
      const telegramMessage = `📄 Новый документ добавлен в систему:
📋 Название: ${document?.title}
💰 Цена: ${document?.price_rub} ₽
📊 Страниц: ${document?.page_count ?? '—'}
📅 Дата: ${new Date().toLocaleString('ru-RU')}`

      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'HTML'
        })
      })

      if (!response.ok) {
        console.error('Telegram notification failed:', await response.text())
      } else {
        console.log('✅ Telegram уведомление отправлено')
      }
    } catch (telegramError) {
      console.error('Telegram error:', telegramError)
    }

    const response = NextResponse.json({ document })
    maybeAttachSessionCookie(response, validation)

    return response
  } catch (error) {
    console.error('Create document API error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
