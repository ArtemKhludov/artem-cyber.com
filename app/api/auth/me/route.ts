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
        users (
          id,
          email,
          name,
          role,
          created_at
        )
      `)
            .eq('session_token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Недействительная сессия' }, { status: 401 })
        }

        return NextResponse.json(session.users)
    } catch (error) {
        console.error('Session check error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}