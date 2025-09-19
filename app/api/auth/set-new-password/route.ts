import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { verifyRequestOrigin } from '@/lib/security'
import { revokeUserSessions } from '@/lib/session'

export async function POST(request: NextRequest) {
    try {
        try {
            verifyRequestOrigin(request)
        } catch (error) {
            if (error instanceof Error) {
                return NextResponse.json({ error: error.message }, { status: 403 })
            }
            return NextResponse.json({ error: 'Запрос отклонен' }, { status: 403 })
        }

        const { token, password } = await request.json()

        if (!token || !password) {
            return NextResponse.json({ error: 'Токен и пароль обязательны' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Пароль должен содержать минимум 6 символов' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name, reset_password_expires')
            .eq('reset_password_token', token)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'Недействительный или истекший токен' }, { status: 400 })
        }

        const now = new Date()
        const expiresAt = new Date(user.reset_password_expires)

        if (now > expiresAt) {
            return NextResponse.json({ error: 'Токен истек. Запросите новый сброс пароля' }, { status: 400 })
        }

        const passwordHash = await bcrypt.hash(password, 12)

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: passwordHash,
                reset_password_token: null,
                reset_password_expires: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Password update error:', updateError)
            return NextResponse.json({ error: 'Ошибка обновления пароля' }, { status: 500 })
        }

        await revokeUserSessions(user.id, { supabase })

        return NextResponse.json({
            message: 'Пароль успешно изменен. Теперь вы можете войти в систему с новым паролем'
        })

    } catch (error) {
        console.error('Set new password error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
