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
 * Middleware для проверки доступа пользователя к курсу
 * Проверяет авторизацию и наличие покупки курса
 */
export async function checkCourseAccess(courseId: string): Promise<CourseAccessCheck> {
    try {
        // Получаем токен сессии из cookies
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session')?.value || cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!sessionToken) {
            return {
                hasAccess: false,
                error: 'Не авторизован'
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

        // Ищем активную запись доступа (user_course_access) вместо прямого обращения к purchases
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
            // Лениво восстанавливаем доступ из завершенных покупок (если удалили руками)
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
                    error: 'Нет доступа к курсу. Пожалуйста, приобретите курс.'
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
            error: 'Внутренняя ошибка сервера'
        }
    }
}

/**
 * Проверка доступа для администратора
 * Администраторы имеют доступ ко всем курсам
 */
export async function checkAdminCourseAccess(courseId: string): Promise<CourseAccessCheck> {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session')?.value || cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!sessionToken) {
            return {
                hasAccess: false,
                error: 'Не авторизован'
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

        // Администраторы имеют доступ ко всем курсам
        if (userRole === 'admin') {
            return {
                hasAccess: true,
                userEmail,
                courseId
            }
        }

        // Для обычных пользователей проверяем покупку
        return await checkCourseAccess(courseId)

    } catch (error) {
        console.error('Error checking admin course access:', error)
        return {
            hasAccess: false,
            error: 'Внутренняя ошибка сервера'
        }
    }
}

/**
 * Получение информации о курсе с проверкой доступа
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

    // Получаем информацию о курсе
    const { data: course, error: courseError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', courseId)
        .single()

    if (courseError || !course) {
        return {
            success: false,
            error: 'Курс не найден',
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
 * Middleware функция для использования в API routes
 */
export function withCourseAuth(handler: (req: any, context: any, access: CourseAccessCheck) => Promise<any>) {
    return async (req: any, context: any) => {
        const courseId = context.params?.courseId

        if (!courseId) {
            return Response.json({ error: 'Course ID не найден' }, { status: 400 })
        }

        const access = await checkCourseAccess(courseId)

        if (!access.hasAccess) {
            return Response.json({
                error: access.error || 'Доступ запрещен'
            }, { status: 403 })
        }

        return handler(req, context, access)
    }
}

/**
 * Middleware функция для администраторов
 */
export function withAdminCourseAuth(handler: (req: any, context: any, access: CourseAccessCheck) => Promise<any>) {
    return async (req: any, context: any) => {
        const courseId = context.params?.courseId

        if (!courseId) {
            return Response.json({ error: 'Course ID не найден' }, { status: 400 })
        }

        const access = await checkAdminCourseAccess(courseId)

        if (!access.hasAccess) {
            return Response.json({
                error: access.error || 'Доступ запрещен'
            }, { status: 403 })
        }

        return handler(req, context, access)
    }
}
