import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyRequestOriginSmart } from '@/lib/security'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        // Проверка origin для CSRF защиты
        try {
            verifyRequestOriginSmart(request, {
                allowSameDomain: true
            })
        } catch (error) {
            console.error('Origin verification failed for reset password:', error)
            return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 })
        }

        const { token, password } = await request.json()

        if (!token || !password) {
            return NextResponse.json({ error: 'Токен и пароль обязательны' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Пароль должен содержать минимум 6 символов' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Проверяем токен
        const { data: resetToken, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('user_id, expires_at')
            .eq('token', token)
            .single()

        if (tokenError || !resetToken) {
            return NextResponse.json({ error: 'Недействительный или истекший токен' }, { status: 400 })
        }

        // Проверяем, не истек ли токен
        const now = new Date()
        const expiresAt = new Date(resetToken.expires_at)

        if (now > expiresAt) {
            // Удаляем истекший токен
            await supabase
                .from('password_reset_tokens')
                .delete()
                .eq('token', token)

            return NextResponse.json({ error: 'Токен истек. Запросите восстановление пароля заново' }, { status: 400 })
        }

        // Хешируем новый пароль
        const hashedPassword = await bcrypt.hash(password, 12)

        // Обновляем пароль пользователя
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', resetToken.user_id)

        if (updateError) {
            console.error('Error updating password:', updateError)
            return NextResponse.json({ error: 'Ошибка при обновлении пароля' }, { status: 500 })
        }

        // Удаляем использованный токен
        await supabase
            .from('password_reset_tokens')
            .delete()
            .eq('token', token)

        // Отзываем все активные сессии пользователя для безопасности
        await supabase
            .from('user_sessions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('user_id', resetToken.user_id)
            .is('revoked_at', null)

        console.log(`Password reset successful for user ${resetToken.user_id}`)

        return NextResponse.json({
            success: true,
            message: 'Пароль успешно изменен. Вы можете войти с новым паролем'
        })

    } catch (error) {
        console.error('Error in reset password:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Проверяем токен
        const { data: resetToken, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('user_id, expires_at')
            .eq('token', token)
            .single()

        if (tokenError || !resetToken) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 400 })
        }

        // Проверяем, не истек ли токен
        const now = new Date()
        const expiresAt = new Date(resetToken.expires_at)

        if (now > expiresAt) {
            return NextResponse.json({ error: 'Токен истек' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: 'Токен действителен'
        })

    } catch (error) {
        console.error('Error validating reset token:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}