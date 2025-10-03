import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
    try {
        const { email, testType = 'simple' } = await request.json()

        if (!email) {
            return NextResponse.json({ 
                error: 'Email is required' 
            }, { status: 400 })
        }

        console.log(`🧪 Testing Resend email to: ${email}`)
        console.log(`🧪 Test type: ${testType}`)

        let emailContent
        let subject

        switch (testType) {
            case 'welcome':
                subject = '🧪 Тест Resend - Добро пожаловать'
                emailContent = {
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2563eb;">🧪 Тест Resend</h1>
                            <p>Это тестовое письмо для проверки работы Resend на домене energylogic-ai.com</p>
                            <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                            <p><strong>Тип теста:</strong> Welcome Email</p>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 14px;">
                                Если вы получили это письмо, значит Resend работает корректно!
                            </p>
                        </div>
                    `,
                    text: `🧪 Тест Resend - Добро пожаловать\n\nЭто тестовое письмо для проверки работы Resend на домене energylogic-ai.com\nВремя отправки: ${new Date().toLocaleString('ru-RU')}\nТип теста: Welcome Email\n\nЕсли вы получили это письмо, значит Resend работает корректно!`
                }
                break

            case 'callback':
                subject = '🧪 Тест Resend - Обратный звонок'
                emailContent = {
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2563eb;">🧪 Тест Resend</h1>
                            <p>Это тестовое письмо для проверки работы Resend на домене energylogic-ai.com</p>
                            <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                            <p><strong>Тип теста:</strong> Callback Email</p>
                            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <h3>Детали тестового запроса:</h3>
                                <p><strong>Имя:</strong> Тестовый Пользователь</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Телефон:</strong> +7 (999) 123-45-67</p>
                                <p><strong>Сообщение:</strong> Это тестовый запрос на обратный звонок</p>
                            </div>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 14px;">
                                Если вы получили это письмо, значит Resend работает корректно!
                            </p>
                        </div>
                    `,
                    text: `🧪 Тест Resend - Обратный звонок\n\nЭто тестовое письмо для проверки работы Resend на домене energylogic-ai.com\nВремя отправки: ${new Date().toLocaleString('ru-RU')}\nТип теста: Callback Email\n\nДетали тестового запроса:\nИмя: Тестовый Пользователь\nEmail: ${email}\nТелефон: +7 (999) 123-45-67\nСообщение: Это тестовый запрос на обратный звонок\n\nЕсли вы получили это письмо, значит Resend работает корректно!`
                }
                break

            default:
                subject = '🧪 Тест Resend - Простое письмо'
                emailContent = {
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2563eb;">🧪 Тест Resend</h1>
                            <p>Это тестовое письмо для проверки работы Resend на домене energylogic-ai.com</p>
                            <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                            <p><strong>Тип теста:</strong> Simple Email</p>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 14px;">
                                Если вы получили это письмо, значит Resend работает корректно!
                            </p>
                        </div>
                    `,
                    text: `🧪 Тест Resend - Простое письмо\n\nЭто тестовое письмо для проверки работы Resend на домене energylogic-ai.com\nВремя отправки: ${new Date().toLocaleString('ru-RU')}\nТип теста: Simple Email\n\nЕсли вы получили это письмо, значит Resend работает корректно!`
                }
        }

        const result = await sendEmail({
            to: email,
            subject: subject,
            html: emailContent.html,
            text: emailContent.text
        })

        console.log(`✅ Resend test email sent successfully:`, result)

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
            result: result,
            testType: testType,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('❌ Resend test failed:', error)
        return NextResponse.json({ 
            error: 'Failed to send test email',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const email = url.searchParams.get('email')
        const testType = url.searchParams.get('type') || 'simple'

        if (!email) {
            return NextResponse.json({ 
                error: 'Email parameter is required',
                usage: 'Add ?email=your@email.com&type=simple|welcome|callback'
            }, { status: 400 })
        }

        // Используем POST логику
        const response = await POST(request)
        return response

    } catch (error) {
        console.error('❌ Resend test failed:', error)
        return NextResponse.json({ 
            error: 'Failed to send test email',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
