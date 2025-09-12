import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
        // Проверяем авторизацию
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session_token')?.value

        if (!sessionToken) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        // Проверяем сессию пользователя
        const { data: session, error: sessionError } = await supabase
            .from('user_sessions')
            .select(`
        user_id,
        users (
          id,
          email
        )
      `)
            .eq('session_token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Недействительная сессия' }, { status: 401 })
        }

        const userEmail = (session.users as any)?.email
        const userId = session.user_id

        const body: ProgressEvent = await request.json()
        const { course_item_id, event_type, progress_data, metadata } = body

        if (!course_item_id || !event_type) {
            return NextResponse.json({ error: 'Недостаточно данных' }, { status: 400 })
        }

        // Получаем информацию об элементе курса
        const { data: courseItem, error: itemError } = await supabase
            .from('course_items')
            .select(`
        id,
        course_id,
        type,
        is_required,
        title
      `)
            .eq('id', course_item_id)
            .single()

        if (itemError || !courseItem) {
            return NextResponse.json({ error: 'Элемент курса не найден' }, { status: 404 })
        }

        // Проверяем доступ к курсу
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_email', userEmail)
            .eq('document_id', courseItem.course_id)
            .eq('payment_status', 'completed')
            .single()

        if (purchaseError || !purchase) {
            return NextResponse.json({ error: 'Нет доступа к курсу' }, { status: 403 })
        }

        // Определяем новый статус и прогресс
        let newStatus: 'not_started' | 'in_progress' | 'done' = 'in_progress'
        let newProgressPct = 0
        let newLastPositionSec = 0
        let newLastPage = 1

        switch (event_type) {
            case 'video_timeupdate':
                if (progress_data.seconds && progress_data.duration) {
                    newLastPositionSec = progress_data.seconds
                    newProgressPct = Math.floor((progress_data.seconds / progress_data.duration) * 100)

                    // Считаем завершенным если просмотрено 90% или больше
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

                    // Считаем завершенным если просмотрены все страницы
                    if (progress_data.page >= progress_data.pages_count) {
                        newStatus = 'done'
                        newProgressPct = 100
                    }
                }
                break

            case 'workbook_filled':
                if (progress_data.fields_count && progress_data.fields_count > 0) {
                    newProgressPct = Math.min(progress_data.fields_count * 10, 100) // Упрощенная логика
                    if (progress_data.fields_count >= 5) { // Предполагаем минимум 5 полей
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
                // Обновляем last_opened_item в user_course_progress
                await supabase
                    .from('user_course_progress')
                    .upsert({
                        user_email: userEmail,
                        course_id: courseItem.course_id,
                        last_opened_item: {
                            id: course_item_id,
                            title: courseItem.title,
                            type: courseItem.type,
                            order_index: (courseItem as any).order_index,
                            updated_at: new Date().toISOString()
                        }
                    }, {
                        onConflict: 'user_email,course_id'
                    })
                break
        }

        // Обновляем или создаем запись прогресса
        const progressData = {
            user_id: userId,
            user_email: userEmail,
            course_id: courseItem.course_id,
            course_item_id: course_item_id,
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
            return NextResponse.json({ error: 'Ошибка сохранения прогресса' }, { status: 500 })
        }

        // Проверяем и выдаем достижения
        await checkAchievements(userEmail, courseItem.course_id, event_type, newStatus)

        return NextResponse.json({
            success: true,
            progress: {
                status: newStatus,
                progress_pct: newProgressPct,
                last_position_sec: newLastPositionSec,
                last_page: newLastPage
            }
        })

    } catch (error) {
        console.error('Error processing progress event:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

async function checkAchievements(userEmail: string, courseId: string, eventType: string, status: string) {
    try {
        // Проверяем достижение "Video Starter"
        if (eventType === 'video_timeupdate' && status === 'done') {
            await supabase.rpc('check_and_award_achievements', {
                p_user_email: userEmail,
                p_course_id: courseId,
                p_achievement_type: 'video_starter'
            })
        }

        // Проверяем достижение "PDF Master"
        if (eventType === 'pdf_pageview' && status === 'done') {
            await supabase.rpc('check_and_award_achievements', {
                p_user_email: userEmail,
                p_course_id: courseId,
                p_achievement_type: 'pdf_master'
            })
        }

        // Проверяем достижение "Workbook Expert"
        if (eventType === 'workbook_filled' && status === 'done') {
            await supabase.rpc('check_and_award_achievements', {
                p_user_email: userEmail,
                p_course_id: courseId,
                p_achievement_type: 'workbook_expert'
            })
        }

        // Проверяем достижение "Course Finisher"
        if (status === 'done') {
            // Получаем общий прогресс курса
            const { data: overallProgress } = await supabase
                .rpc('calculate_course_progress', {
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
