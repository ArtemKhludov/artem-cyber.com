import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

interface TelegramUpdate {
    update_id: number
    message?: {
        message_id: number
        from: {
            id: number
            is_bot: boolean
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
        }
        chat: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            type: string
        }
        date: number
        text?: string
    }
    callback_query?: {
        id: string
        from: {
            id: number
            is_bot: boolean
            first_name: string
            last_name?: string
            username?: string
        }
        message?: {
            message_id: number
            chat: {
                id: number
                type: string
            }
        }
        data?: string
    }
}

export async function POST(request: NextRequest) {
    try {
        const update: TelegramUpdate = await request.json()

        console.log('Telegram webhook received:', JSON.stringify(update, null, 2))

        // Обрабатываем сообщения
        if (update.message) {
            await handleMessage(update.message)
        }

        // Обрабатываем callback queries (кнопки)
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query)
        }

        return NextResponse.json({ ok: true })

    } catch (error) {
        console.error('Telegram webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function handleMessage(message: TelegramUpdate['message']) {
    if (!message) return

    const { from, chat, text } = message
    const telegramUserId = from.id.toString()
    const username = from.username || `${from.first_name} ${from.last_name || ''}`.trim()

    console.log(`Processing message from ${username} (${telegramUserId}): ${text}`)

    const supabase = getSupabaseAdmin()

    // Проверяем, есть ли пользователь с таким Telegram ID
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email, telegram_chat_id')
        .eq('telegram_chat_id', telegramUserId)
        .single()

    if (userError || !user) {
        // Пользователь не найден, отправляем инструкции
        await sendMessage(chat.id, `👋 Привет! Я бот EnergyLogic.

Для получения уведомлений о ваших заявках, пожалуйста:

1. Зайдите в личный кабинет: https://www.energylogic-ai.com/dashboard
2. В разделе "Настройки" подключите Telegram
3. Введите ваш Telegram username: @${from.username || 'ваш_username'}

После подключения вы будете получать уведомления о:
• Новых ответах на ваши заявки
• Изменении статуса заявок
• Важных обновлениях

Если у вас нет аккаунта, зарегистрируйтесь на сайте!`)
        return
    }

    // Обрабатываем команды
    if (text) {
        switch (text.toLowerCase()) {
            case '/start':
                await sendMessage(chat.id, `👋 Привет, ${user.name}!

Ваш Telegram успешно подключен к EnergyLogic.

Вы будете получать уведомления о:
• 📧 Новых ответах на ваши заявки
• 📊 Изменении статуса заявок  
• 🔔 Важных обновлениях

Для отключения уведомлений зайдите в личный кабинет и отключите Telegram в настройках.`)
                break

            case '/help':
                await sendMessage(chat.id, `🆘 Помощь по боту EnergyLogic:

/start - Начать работу с ботом
/help - Показать эту справку
/status - Проверить статус подключения

Для получения поддержки:
• Зайдите в личный кабинет: https://www.energylogic-ai.com/dashboard
• Создайте заявку на обратный звонок
• Обратитесь к администратору

Бот работает автоматически и не требует постоянного взаимодействия.`)
                break

            case '/status':
                await sendMessage(chat.id, `✅ Статус подключения:

👤 Пользователь: ${user.name}
📧 Email: ${user.email}
🔗 Telegram: Подключен
📱 Chat ID: ${telegramUserId}

Все уведомления активны!`)
                break

            default:
                // Обычное сообщение - предлагаем создать заявку
                await sendMessage(chat.id, `💬 Спасибо за сообщение!

Для получения помощи:
• Создайте заявку на обратный звонок в личном кабинете
• Или напишите нам на email: support@energylogic-ai.com

Я автоматически уведомлю вас о всех обновлениях по вашим заявкам!`)
        }
    }
}

async function handleCallbackQuery(callbackQuery: TelegramUpdate['callback_query']) {
    if (!callbackQuery) return

    const { from, data } = callbackQuery
    const telegramUserId = from.id.toString()

    console.log(`Processing callback query from ${telegramUserId}: ${data}`)

    // Отвечаем на callback query
    await answerCallbackQuery(callbackQuery.id, 'Обработано!')

    // Здесь можно добавить обработку различных кнопок
    if (data === 'dashboard') {
        await sendMessage(from.id, 'Перейдите в личный кабинет: https://www.energylogic-ai.com/dashboard')
    }
}

async function sendMessage(chatId: number, text: string) {
    const botToken = process.env.USER_TELEGRAM_BOT_TOKEN

    if (!botToken) {
        console.error('USER_TELEGRAM_BOT_TOKEN not configured')
        return
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Telegram API error:', errorData)
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error)
    }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
    const botToken = process.env.USER_TELEGRAM_BOT_TOKEN

    if (!botToken) {
        console.error('USER_TELEGRAM_BOT_TOKEN not configured')
        return
    }

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text
            })
        })
    } catch (error) {
        console.error('Error answering callback query:', error)
    }
}
