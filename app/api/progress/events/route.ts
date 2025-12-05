import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  SESSION_COOKIE_NAME,
  attachSessionCookie,
  clearSessionCookie,
  getSessionErrorMessage,
  validateSessionToken
} from '@/lib/session'
import { verifyRequestOrigin } from '@/lib/security'

interface ProgressEvent {
  course_item_id: string
  event_type: 'video_timeupdate' | 'pdf_pageview' | 'workbook_filled' | 'manual_mark_done' | 'item_opened'
  progress_data: {
    seconds?: number
    duration?: number
    page?: number
    pages_count?: number
    fields_count?: number
    progress_pct?: number
  }
  metadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    try {
      verifyRequestOrigin(request)
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      return NextResponse.json({ error: 'Request rejected' }, { status: 403 })
    }

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

    const userEmail = validation.user.email
    const userId = validation.session.user_id
    const body: ProgressEvent = await request.json()
    const { course_item_id, event_type, progress_data, metadata } = body

    if (!course_item_id || !event_type) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 400 })
    }

    const { data: courseItem, error: itemError } = await supabase
      .from('course_items')
      .select('id, course_id, type, is_required, title, order_index')
      .eq('id', course_item_id)
      .maybeSingle()

    if (itemError || !courseItem) {
      return NextResponse.json({ error: 'Course item not found' }, { status: 404 })
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_email', userEmail)
      .eq('document_id', courseItem.course_id)
      .eq('payment_status', 'completed')
      .maybeSingle()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'No course access' }, { status: 403 })
    }

    let newStatus: 'not_started' | 'in_progress' | 'done' = 'in_progress'
    let newProgressPct = 0
    let newLastPositionSec = 0
    let newLastPage = 1

    switch (event_type) {
      case 'video_timeupdate':
        if (progress_data.seconds && progress_data.duration) {
          newLastPositionSec = progress_data.seconds
          newProgressPct = Math.floor((progress_data.seconds / progress_data.duration) * 100)

          if (newProgressPct >= 90) {
            newStatus = 'done'
            newProgressPct = 100
          }
        }
        break
      case 'pdf_pageview':
        if (progress_data.page && progress_data.pages_count) {
          newLastPage = progress_data.page
          newProgressPct = Math.floor((progress_data.page / progress_data.pages_count) * 100)

          if (progress_data.page >= progress_data.pages_count) {
            newStatus = 'done'
            newProgressPct = 100
          }
        }
        break
      case 'workbook_filled':
        if (progress_data.fields_count && progress_data.fields_count > 0) {
          newProgressPct = Math.min(progress_data.fields_count * 10, 100)
          if (progress_data.fields_count >= 5) {
            newStatus = 'done'
            newProgressPct = 100
          }
        }
        break
      case 'manual_mark_done':
        newStatus = 'done'
        newProgressPct = 100
        break
      case 'item_opened':
        await supabase
          .from('user_course_progress')
          .upsert({
            user_email: userEmail,
            course_id: courseItem.course_id,
            last_opened_item: {
              id: course_item_id,
              title: courseItem.title,
              type: courseItem.type,
              order_index: courseItem.order_index,
              updated_at: new Date().toISOString()
            }
          }, {
            onConflict: 'user_email,course_id'
          })
        break
    }

    const progressData = {
      user_id: userId,
      user_email: userEmail,
      course_id: courseItem.course_id,
      course_item_id,
      status: newStatus,
      progress_pct: newProgressPct,
      last_position_sec: newLastPositionSec,
      last_page: newLastPage,
      meta: {
        last_event: event_type,
        event_data: progress_data,
        metadata: metadata || {}
      }
    }

    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: 'user_email,course_item_id'
      })

    if (upsertError) {
      console.error('Error upserting progress:', upsertError)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    await checkAchievements(supabase, userEmail, courseItem.course_id, event_type, newStatus)

    const response = NextResponse.json({
      success: true,
      progress: {
        status: newStatus,
        progress_pct: newProgressPct,
        last_position_sec: newLastPositionSec,
        last_page: newLastPage
      }
    })

    if (validation.shouldRefreshCookie && validation.cookieMaxAgeSeconds) {
      attachSessionCookie(response, validation.session.session_token, validation.cookieMaxAgeSeconds)
    }

    return response
  } catch (error) {
    console.error('Error processing progress event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkAchievements(
  supabase: SupabaseClient,
  userEmail: string,
  courseId: string,
  eventType: string,
  status: string
) {
  try {
    if (eventType === 'video_timeupdate' && status === 'done') {
      await supabase.rpc('check_and_award_achievements', {
        p_user_email: userEmail,
        p_course_id: courseId,
        p_achievement_type: 'video_starter'
      })
    }

    if (eventType === 'pdf_pageview' && status === 'done') {
      await supabase.rpc('check_and_award_achievements', {
        p_user_email: userEmail,
        p_course_id: courseId,
        p_achievement_type: 'pdf_master'
      })
    }

    if (eventType === 'workbook_filled' && status === 'done') {
      await supabase.rpc('check_and_award_achievements', {
        p_user_email: userEmail,
        p_course_id: courseId,
        p_achievement_type: 'workbook_expert'
      })
    }

    if (status === 'done') {
      const { data: overallProgress } = await supabase.rpc('calculate_course_progress', {
        p_user_email: userEmail,
        p_course_id: courseId
      })

      if (overallProgress === 100) {
        await supabase.rpc('check_and_award_achievements', {
          p_user_email: userEmail,
          p_course_id: courseId,
          p_achievement_type: 'course_finisher'
        })
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error)
  }
}
