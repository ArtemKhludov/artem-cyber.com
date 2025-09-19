import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    attachSessionCookie,
    getSessionDurations,
    revokeSessionToken
} from '@/lib/session'
import { getClientIp, getUserAgent, verifyRequestOrigin } from '@/lib/security'

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

        const { access_token, email, name, picture, remember = true } = await request.json()

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

        const rememberMe = Boolean(remember)
        const { idleMs } = getSessionDurations(rememberMe)
        const sessionToken = crypto.randomUUID()
        const now = new Date()
        const expiresAt = new Date(now.getTime() + idleMs)
        const clientIp = getClientIp(request)
        const userAgent = getUserAgent(request)
        const csrfSecret = crypto.randomUUID()

        const { error: sessionError } = await supabase
            .from('user_sessions')
            .insert({
                user_id: user.id,
                session_token: sessionToken,
                expires_at: expiresAt.toISOString(),
                last_activity: now.toISOString(),
                revoked_at: null,
                remember_me: rememberMe,
                ip_address: clientIp ?? null,
                user_agent: userAgent ?? null,
                csrf_secret: csrfSecret
            })

        if (sessionError) {
            console.error('Session creation error:', sessionError)
            return NextResponse.json({ error: 'Ошибка создания сессии' }, { status: 500 })
        }

        const cookieStore = await cookies()
        const previousToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (previousToken && previousToken !== sessionToken) {
            await revokeSessionToken(previousToken, { supabase })
        }

        const cookieMaxAgeSeconds = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))

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

        const response = NextResponse.json({
            message: 'Успешная авторизация через Google',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar_url: user.avatar_url
            }
        })

        response.headers.set('X-Session-Expires-At', expiresAt.toISOString())
        response.headers.set('X-Session-Remember-Me', rememberMe ? '1' : '0')
        attachSessionCookie(response, sessionToken, cookieMaxAgeSeconds)

        return response

    } catch (error) {
        console.error('Google OAuth error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
