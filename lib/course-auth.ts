import { getSupabaseAdmin } from './supabase'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    getSessionErrorMessage,
    validateSessionToken
} from './session'
import { ensureCourseAccessForUser } from './course-access'

export interface CourseAccessCheck {
    hasAccess: boolean
    userEmail?: string
    courseId?: string
    error?: string
}

/**
 * Middleware to check user access to a course.
 * Validates auth and confirms the course purchase/access record.
 */
export async function checkCourseAccess(courseId: string): Promise<CourseAccessCheck> {
    try {
        // Get session token from cookies
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session')?.value || cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!sessionToken) {
            return {
                hasAccess: false,
                error: 'Not authorized'
            }
        }

        const supabase = getSupabaseAdmin()

        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return {
                hasAccess: false,
                error: getSessionErrorMessage(validation.reason)
            }
        }

        const userEmail = validation.user.email
        const userId = validation.session.user_id

        const now = new Date()

        // Look for an active access record (user_course_access) instead of direct purchases check
        const { data: existingAccess, error: accessError } = await supabase
            .from('user_course_access')
            .select('id, expires_at, revoked_at')
            .eq('user_id', userId)
            .eq('document_id', courseId)
            .is('revoked_at', null)
            .maybeSingle()

        if (accessError) {
            console.error('Error fetching course access record:', accessError)
        }

        const isActive = existingAccess && (!existingAccess.expires_at || new Date(existingAccess.expires_at) > now)

        if (!isActive) {
            // Lazily restore access from completed purchases (if it was manually removed)
            await ensureCourseAccessForUser(supabase, userId, courseId)

            const { data: refreshedAccess } = await supabase
                .from('user_course_access')
                .select('id, expires_at, revoked_at')
                .eq('user_id', userId)
                .eq('document_id', courseId)
                .is('revoked_at', null)
                .maybeSingle()

            if (!refreshedAccess || (refreshedAccess.expires_at && new Date(refreshedAccess.expires_at) <= now)) {
                return {
                    hasAccess: false,
                    userEmail,
                    courseId,
                    error: 'No course access. Please purchase the course.'
                }
            }
        }

        return {
            hasAccess: true,
            userEmail,
            courseId
        }

    } catch (error) {
        console.error('Error checking course access:', error)
        return {
            hasAccess: false,
            error: 'Internal server error'
        }
    }
}

/**
 * Access check for admins.
 * Admins have access to all courses.
 */
export async function checkAdminCourseAccess(courseId: string): Promise<CourseAccessCheck> {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session')?.value || cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!sessionToken) {
            return {
                hasAccess: false,
                error: 'Not authorized'
            }
        }

        const supabase = getSupabaseAdmin()

        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return {
                hasAccess: false,
                error: getSessionErrorMessage(validation.reason)
            }
        }

        const userEmail = validation.user.email
        const userRole = validation.user.role

        // Admins have access to all courses
        if (userRole === 'admin') {
            return {
                hasAccess: true,
                userEmail,
                courseId
            }
        }

        // For regular users, validate purchase/access
        return await checkCourseAccess(courseId)

    } catch (error) {
        console.error('Error checking admin course access:', error)
        return {
            hasAccess: false,
            error: 'Internal server error'
        }
    }
}

/**
 * Fetch course info with access validation.
 */
export async function getCourseWithAccess(courseId: string, allowAdmin: boolean = false) {
    const accessCheck = allowAdmin
        ? await checkAdminCourseAccess(courseId)
        : await checkCourseAccess(courseId)

    if (!accessCheck.hasAccess) {
        return {
            success: false,
            error: accessCheck.error,
            access: accessCheck
        }
    }

    const supabase = getSupabaseAdmin()

    // Fetch course info
    const { data: course, error: courseError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', courseId)
        .single()

    if (courseError || !course) {
        return {
            success: false,
            error: 'Course not found',
            access: accessCheck
        }
    }

    return {
        success: true,
        course,
        access: accessCheck
    }
}

/**
 * Middleware helper for API routes.
 */
export function withCourseAuth(handler: (req: any, context: any, access: CourseAccessCheck) => Promise<any>) {
    return async (req: any, context: any) => {
        const courseId = context.params?.courseId

        if (!courseId) {
            return Response.json({ error: 'Course ID not found' }, { status: 400 })
        }

        const access = await checkCourseAccess(courseId)

        if (!access.hasAccess) {
            return Response.json({
                error: access.error || 'Access denied'
            }, { status: 403 })
        }

        return handler(req, context, access)
    }
}

/**
 * Middleware helper for administrators.
 */
export function withAdminCourseAuth(handler: (req: any, context: any, access: CourseAccessCheck) => Promise<any>) {
    return async (req: any, context: any) => {
        const courseId = context.params?.courseId

        if (!courseId) {
            return Response.json({ error: 'Course ID not found' }, { status: 400 })
        }

        const access = await checkAdminCourseAccess(courseId)

        if (!access.hasAccess) {
            return Response.json({
                error: access.error || 'Access denied'
            }, { status: 403 })
        }

        return handler(req, context, access)
    }
}
