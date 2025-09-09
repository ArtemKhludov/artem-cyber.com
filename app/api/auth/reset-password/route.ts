import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
        }

        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Проверяем, существует ли пользователь
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('email', email)
            .single()

        if (userError || !user) {
            // Не раскрываем, существует ли пользователь
            return NextResponse.json({
                message: 'Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля'
            })
        }

        // Генерируем токен сброса пароля
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 час

        // Сохраняем токен в базе данных
        const { error: updateError } = await supabase
            .from('users')
            .update({
                reset_password_token: resetToken,
                reset_password_expires: resetExpires.toISOString()
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Reset token update error:', updateError)
            return NextResponse.json({ error: 'Ошибка создания токена сброса' }, { status: 500 })
        }


        // В реальном приложении здесь должна быть отправка email
        // Пока что просто логируем ссылку для разработки
        const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
        console.log('🔗 Ссылка для сброса пароля:', resetUrl)

        return NextResponse.json({
            message: 'Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля',
            resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined // Только для разработки
        })

    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
