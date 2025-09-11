import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session_token')?.value

        if (!sessionToken) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const supabase = getSupabaseAdmin()

        // Проверяем сессию
        const { data: session, error: sessionError } = await supabase
            .from('user_sessions')
            .select(`
        user_id,
        expires_at,
        last_activity,
        users (
          id,
          email,
          name,
          created_at
        )
      `)
            .eq('session_token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Недействительная сессия' }, { status: 401 })
        }

        // Получаем роль пользователя из user_profiles
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('email', session.users.email)
            .single()

        const userRole = profile?.role || 'customer'

        // Проверяем время неактивности (30 минут) - только если поле существует
        if (session.last_activity) {
            const lastActivity = new Date(session.last_activity)
            const now = new Date()
            const inactiveTime = now.getTime() - lastActivity.getTime()
            const maxInactiveTime = 30 * 60 * 1000 // 30 минут в миллисекундах

            if (inactiveTime > maxInactiveTime) {
                // Сессия истекла из-за неактивности
                await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('session_token', sessionToken)

                return NextResponse.json({ error: 'Сессия истекла из-за неактивности' }, { status: 401 })
            }

            // Обновляем время последней активности
            await supabase
                .from('user_sessions')
                .update({ last_activity: now.toISOString() })
                .eq('session_token', sessionToken)
        }

        return NextResponse.json({
            ...session.users,
            role: userRole,
            last_activity: session.last_activity || new Date().toISOString()
        })
    } catch (error) {
        console.error('Session check error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}