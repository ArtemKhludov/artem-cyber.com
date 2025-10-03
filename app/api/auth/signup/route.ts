import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email-service'
import { getWelcomeEmailTemplate } from '@/lib/email-templates'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, name, password, phone, callback_request_data } = body

        // Валидация обязательных полей
        if (!email || !name || !password) {
            return NextResponse.json(
                { error: 'Email, имя и пароль обязательны' },
                { status: 400 }
            )
        }

        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Неверный формат email' },
                { status: 400 }
            )
        }

        // Валидация пароля
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Пароль должен содержать минимум 6 символов' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Проверяем, существует ли пользователь
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.trim())
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'Пользователь с таким email уже существует' },
                { status: 400 }
            )
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 12)

        // Создаем пользователя
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email: email.trim(),
                name: name.trim(),
                phone: phone?.trim() || null,
                password_hash: hashedPassword,
                role: 'user',
                email_verified: false
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating user:', createError)
            console.error('Error details:', JSON.stringify(createError, null, 2))
            return NextResponse.json(
                { error: 'Ошибка создания пользователя', details: createError.message },
                { status: 500 }
            )
        }

        // Если есть данные callback запроса, создаем его
        if (callback_request_data) {
            try {
                const { data: callbackRequest, error: callbackError } = await supabase
                    .from('callback_requests')
                    .insert({
                        name: callback_request_data.name,
                        phone: callback_request_data.phone,
                        email: callback_request_data.email,
                        preferred_time: callback_request_data.preferred_time,
                        message: callback_request_data.message,
                        source_page: callback_request_data.source_page,
                        product_type: callback_request_data.product_type,
                        product_name: callback_request_data.product_name,
                        notes: callback_request_data.notes,
                        source: 'website',
                        status: 'new',
                        user_id: newUser.id,
                        auto_created_user: true,
                        user_credentials_sent: true
                    })
                    .select()
                    .single()

                if (callbackError) {
                    console.error('Error creating callback request:', callbackError)
                } else {
                    console.log('Callback request created:', callbackRequest.id)
                }
            } catch (callbackError) {
                console.error('Callback request creation failed:', callbackError)
            }
        }

        // Отправляем приветственное письмо
        try {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                (process.env.NODE_ENV === 'development'
                    ? 'http://localhost:3000'
                    : 'https://www.energylogic-ai.com')

            const emailContent = getWelcomeEmailTemplate({
                name: newUser.name,
                email: newUser.email,
                tempPassword: password, // Временно отправляем пароль в открытом виде
                loginUrl: `${baseUrl}/auth/login`
            })

            await sendEmail({
                to: newUser.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
            })

            console.log(`Welcome email sent to ${newUser.email}`)
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError)
            // Не прерываем выполнение, если не удалось отправить email
        }

        // Отправляем уведомление в Telegram о новой регистрации
        try {
            const telegramMessage = `🆕 Новый пользователь зарегистрирован:
👤 Имя: ${newUser.name}
📧 Email: ${newUser.email}
📞 Телефон: ${newUser.phone || 'Не указан'}
🔐 Тип регистрации: Email/Пароль
✅ Email верифицирован: Нет
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
            success: true,
            message: 'Пользователь успешно создан',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                phone: newUser.phone
            }
        })

    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
