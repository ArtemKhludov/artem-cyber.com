import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkCourseAccess } from '@/lib/course-auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { event_type, course_id, metadata = {} } = body

        if (!event_type || !course_id) {
            return NextResponse.json({
                error: 'Required parameters are missing'
            }, { status: 400 })
        }

        // Check course access
        const accessCheck = await checkCourseAccess(course_id)

        if (!accessCheck.hasAccess || !accessCheck.userEmail) {
            return NextResponse.json({
                error: 'Access denied'
            }, { status: 403 })
        }

        const supabase = getSupabaseAdmin()

        // Log event to analytics table
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
                error: 'Failed to save event'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            event_id: data?.id || null
        })

    } catch (error) {
        console.error('Analytics API error:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}
