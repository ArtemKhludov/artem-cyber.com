import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    validateSessionToken
} from '@/lib/session'

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return NextResponse.json(
                { error: 'Необходима авторизация' },
                { status: 401 }
            )
        }

        const user = validation.user

        // Получаем обращения пользователя через функцию
        const { data: callbacks, error } = await supabase
            .rpc('get_user_callbacks', {
                user_uuid: user.id
            })

        if (error) {
            console.error('Error fetching user callbacks:', error)
            return NextResponse.json(
                { error: 'Ошибка получения обращений' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: callbacks || []
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}