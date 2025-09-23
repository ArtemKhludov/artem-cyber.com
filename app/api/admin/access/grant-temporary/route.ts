import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/session'

async function requireAdmin(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        let sessionToken = authHeader?.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : undefined
        if (!sessionToken) {
            sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
        }

        const validation = await validateSessionToken(sessionToken, { touch: false })
        if (!validation.user || validation.user.role !== 'admin') {
            return { success: false, error: 'Forbidden', status: 403 }
        }

        return {
            success: true,
            userId: validation.session.user_id,
            userEmail: validation.user.email
        }
    } catch (error) {
        return { success: false, error: 'Unauthorized', status: 401 }
    }
}

export async function POST(request: NextRequest) {
    try {
        // Проверяем права администратора
        const adminResult = await requireAdmin(request)
        if (!adminResult.success) {
            return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
        }

        const { userId, courseId, gracePeriodMinutes = 30 } = await request.json()

        if (!userId || !courseId) {
            return NextResponse.json({ error: 'userId и courseId обязательны' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Проверяем, что пользователь существует
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('id', userId)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
        }

        // Проверяем, что курс существует
        const { data: course, error: courseError } = await supabase
            .from('documents')
            .select('id, title')
            .eq('id', courseId)
            .single()

        if (courseError || !course) {
            return NextResponse.json({ error: 'Курс не найден' }, { status: 404 })
        }

        // Вычисляем время окончания grace period
        const gracePeriodUntil = new Date(Date.now() + gracePeriodMinutes * 60 * 1000)

        // Создаем временную покупку (для отслеживания)
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .insert({
                user_id: userId,
                user_email: user.email,
                product_name: course.title,
                product_type: 'course',
                amount_paid: 0, // Временный доступ бесплатный
                currency: 'RUB',
                payment_method: 'grace_period',
                status: 'pending_verification',
                grace_period_until: gracePeriodUntil.toISOString(),
                grace_period_verified: false,
                verification_attempts: 0,
                source: 'admin_grant'
            })
            .select()
            .single()

        if (purchaseError) {
            console.error('Ошибка создания временной покупки:', purchaseError)
            return NextResponse.json({ error: 'Ошибка создания временной покупки' }, { status: 500 })
        }

        // Выдаем временный доступ
        const { data: access, error: accessError } = await supabase
            .from('user_course_access')
            .insert({
                user_id: userId,
                document_id: courseId,
                access_type: 'course',
                is_active: true,
                granted_by: adminResult.userId,
                granted_at: new Date().toISOString(),
                is_grace_period: true,
                grace_period_until: gracePeriodUntil.toISOString(),
                purchase_id: purchase.id,
                metadata: {
                    reason: 'grace_period_access',
                    admin_granted: true,
                    grace_period_minutes: gracePeriodMinutes
                }
            })
            .select()
            .single()

        if (accessError) {
            console.error('Ошибка выдачи временного доступа:', accessError)

            // Откатываем создание покупки
            await supabase.from('purchases').delete().eq('id', purchase.id)

            return NextResponse.json({ error: 'Ошибка выдачи временного доступа' }, { status: 500 })
        }

        // Логируем действие
        await supabase.from('audit_logs').insert({
            user_id: adminResult.userId,
            action: 'grant_temporary_access',
            target_type: 'user_access',
            target_id: access.id,
            metadata: {
                target_user_id: userId,
                course_id: courseId,
                grace_period_minutes: gracePeriodMinutes,
                grace_period_until: gracePeriodUntil.toISOString()
            }
        })

        return NextResponse.json({
            success: true,
            message: `Временный доступ выдан на ${gracePeriodMinutes} минут`,
            data: {
                access,
                purchase,
                gracePeriodUntil: gracePeriodUntil.toISOString(),
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                },
                course: {
                    id: course.id,
                    title: course.title
                }
            }
        })

    } catch (error) {
        console.error('Grant temporary access error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
