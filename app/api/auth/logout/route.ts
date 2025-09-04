import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session_token')?.value

        if (sessionToken) {
            const supabase = getSupabaseAdmin()

            // Удаляем сессию из базы данных
            await supabase
                .from('user_sessions')
                .delete()
                .eq('session_token', sessionToken)
        }

        // Удаляем cookie
        cookieStore.delete('session_token')

        return NextResponse.json({ message: 'Выход выполнен успешно' })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}