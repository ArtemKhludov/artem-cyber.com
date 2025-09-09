import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Проверяем, существует ли пользователь
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
        }

        if (user.email_verified) {
            return NextResponse.json({ error: 'Email уже подтвержден' }, { status: 400 })
        }

        // Генерируем токен верификации
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа

        // Сохраняем токен в базе данных
        const { error: updateError } = await supabase
            .from('users')
            .update({
                verification_token: verificationToken,
                verification_expires: expiresAt.toISOString()
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Verification token update error:', updateError)
            return NextResponse.json({ error: 'Ошибка создания токена верификации' }, { status: 500 })
        }

        // Отправляем email (здесь можно интегрировать с email сервисом)
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${verificationToken}`

        // TODO: Интегрировать с email сервисом (SendGrid, Mailgun, etc.)
        console.log('📧 Email для верификации:', {
            to: email,
            subject: 'Подтверждение email адреса',
            verificationUrl: verificationUrl
        })

        return NextResponse.json({
            message: 'Письмо с подтверждением отправлено на ваш email',
            verificationUrl: verificationUrl // Для тестирования
        })

    } catch (error) {
        console.error('Email verification error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Токен верификации не найден' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Находим пользователя по токену
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('verification_token', token)
            .single()

        if (!user) {
            return NextResponse.json({ error: 'Неверный токен верификации' }, { status: 400 })
        }

        // Проверяем срок действия токена
        if (new Date() > new Date(user.verification_expires)) {
            return NextResponse.json({ error: 'Токен верификации истек' }, { status: 400 })
        }

        // Подтверждаем email
        const { error: updateError } = await supabase
            .from('users')
            .update({
                email_verified: true,
                verification_token: null,
                verification_expires: null
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Email verification update error:', updateError)
            return NextResponse.json({ error: 'Ошибка подтверждения email' }, { status: 500 })
        }

        return NextResponse.json({
            message: 'Email успешно подтвержден',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        })

    } catch (error) {
        console.error('Email verification error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
