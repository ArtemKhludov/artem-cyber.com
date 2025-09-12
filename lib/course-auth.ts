import { getSupabaseAdmin } from './supabase'
import { cookies } from 'next/headers'

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
        const sessionToken = cookieStore.get('session')?.value || cookieStore.get('session_token')?.value

        if (!sessionToken) {
            return {
                hasAccess: false,
                error: 'Не авторизован'
            }
        }

        const supabase = getSupabaseAdmin()

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
            return {
                hasAccess: false,
                error: 'Недействительная сессия'
            }
        }

        const userEmail = (session.users as any)?.email

        // Проверяем доступ к курсу через покупку
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_email', userEmail)
            .eq('document_id', courseId)
            .eq('payment_status', 'completed')
            .single()

        if (purchaseError || !purchase) {
            return {
                hasAccess: false,
                userEmail,
                courseId,
                error: 'Нет доступа к курсу. Пожалуйста, приобретите курс.'
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
        const sessionToken = cookieStore.get('session')?.value || cookieStore.get('session_token')?.value

        if (!sessionToken) {
            return {
                hasAccess: false,
                error: 'Не авторизован'
            }
        }

        const supabase = getSupabaseAdmin()

        // Проверяем сессию и роль пользователя
        const { data: session, error: sessionError } = await supabase
            .from('user_sessions')
            .select(`
        user_id,
        users (
          id,
          email,
          role
        )
      `)
            .eq('session_token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (sessionError || !session) {
            return {
                hasAccess: false,
                error: 'Недействительная сессия'
            }
        }

        const userEmail = (session.users as any)?.email
        const userRole = (session.users as any)?.role

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
