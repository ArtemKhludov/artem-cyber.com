import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkCourseAccess } from '@/lib/course-auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { event_type, course_id, metadata = {} } = body

        if (!event_type || !course_id) {
            return NextResponse.json({
                error: 'Отсутствуют обязательные параметры'
            }, { status: 400 })
        }

        // Проверяем доступ к курсу
        const accessCheck = await checkCourseAccess(course_id)

        if (!accessCheck.hasAccess || !accessCheck.userEmail) {
            return NextResponse.json({
                error: 'Доступ запрещен'
            }, { status: 403 })
        }

        const supabase = getSupabaseAdmin()

        // Логируем событие в таблицу аналитики
        const { data, error } = await supabase
            .from('user_analytics_events')
            .insert({
                user_email: accessCheck.userEmail,
                event_type,
                course_id,
                metadata: metadata,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (error) {
            console.error('Error logging analytics event:', error)
            return NextResponse.json({
                error: 'Ошибка сохранения события'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            event_id: data?.id || null
        })

    } catch (error) {
        console.error('Analytics API error:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера'
        }, { status: 500 })
    }
}