import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Получаем пользователя по email
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
        }

        // Проверяем пароль
        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
            return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
        }

        // Создаем сессию
        const sessionToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней

        const { error: sessionError } = await supabase
            .from('user_sessions')
            .insert({
                user_id: user.id,
                session_token: sessionToken,
                expires_at: expiresAt.toISOString()
            })

        if (sessionError) {
            console.error('Session creation error:', sessionError)
            return NextResponse.json({ error: 'Ошибка создания сессии' }, { status: 500 })
        }

        // Устанавливаем cookie
        const cookieStore = await cookies()
        cookieStore.set('session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 дней
            path: '/'
        })

        // Возвращаем данные пользователя без пароля
        const { password_hash, ...userWithoutPassword } = user
        return NextResponse.json({ user: userWithoutPassword })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}