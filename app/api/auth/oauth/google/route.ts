import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const { access_token, email, name, picture } = await request.json()

        if (!access_token || !email || !name) {
            return NextResponse.json({ error: 'Недостаточно данных для авторизации' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Проверяем, существует ли пользователь
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        let user

        if (existingUser) {
            // Пользователь существует, обновляем данные
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    name: name,
                    avatar_url: picture,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingUser.id)
                .select()
                .single()

            if (updateError) {
                console.error('User update error:', updateError)
                return NextResponse.json({ error: 'Ошибка обновления пользователя' }, { status: 500 })
            }

            user = updatedUser
        } else {
            // Создаем нового пользователя
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email,
                    name,
                    avatar_url: picture,
                    role: 'user',
                    oauth_provider: 'google',
                    oauth_id: email, // Используем email как OAuth ID
                    email_verified: true, // Google OAuth пользователи считаются верифицированными
                    phone: null,
                    password_hash: 'oauth_user' // Заглушка для OAuth пользователей
                })
                .select()
                .single()

            if (createError) {
                console.error('User creation error:', createError)
                return NextResponse.json({
                    error: 'Ошибка создания пользователя',
                    details: createError.message
                }, { status: 500 })
            }

            user = newUser
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
            maxAge: 7 * 24 * 60 * 60 // 7 дней
        })

        // Отправка уведомления в Telegram
        try {
            const telegramMessage = `🆕 Новый пользователь зарегистрирован:
👤 Имя: ${user.name}
📧 Email: ${user.email}
📞 Телефон: Не указан
🔐 Тип регистрации: Google OAuth
✅ Email верифицирован: Да
📅 Дата: ${new Date().toLocaleString('ru-RU')}`

            const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: telegramMessage,
                    parse_mode: 'HTML'
                })
            })

            if (!response.ok) {
                console.error('Telegram notification failed:', await response.text())
            } else {
                console.log('✅ Telegram уведомление отправлено')
            }
        } catch (telegramError) {
            console.error('Telegram error:', telegramError)
        }

        return NextResponse.json({
            message: 'Успешная авторизация через Google',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar_url: user.avatar_url
            }
        })

    } catch (error) {
        console.error('Google OAuth error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
