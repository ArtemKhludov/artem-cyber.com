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

        // Handle messages
        if (update.message) {
            await handleMessage(update.message)
        }

        // Handle callback queries (buttons)
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

    // Check if user with this Telegram ID exists
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email, telegram_chat_id')
        .eq('telegram_chat_id', telegramUserId)
        .single()

    if (userError || !user) {
        // User not found, send instructions
        await sendMessage(chat.id, `👋 Hello! I'm the EnergyLogic bot.

To receive notifications about your requests, please:

1. Go to your dashboard: https://www.energylogic-ai.com/dashboard
2. In the "Settings" section, connect Telegram
3. Enter your Telegram username: @${from.username || 'your_username'}

After connecting, you will receive notifications about:
• New replies to your requests
• Request status changes
• Important updates

If you don't have an account, register on the website!`)
        return
    }

    // Handle commands
    if (text) {
        switch (text.toLowerCase()) {
            case '/start':
                await sendMessage(chat.id, `👋 Hello, ${user.name}!

Your Telegram is successfully connected to EnergyLogic.

You will receive notifications about:
• 📧 New replies to your requests
• 📊 Request status changes
• 🔔 Important updates

To disable notifications, go to your dashboard and disable Telegram in settings.`)
                break

            case '/help':
                await sendMessage(chat.id, `🆘 EnergyLogic Bot Help:

/start - Start working with the bot
/help - Show this help
/status - Check connection status

To get support:
• Go to your dashboard: https://www.energylogic-ai.com/dashboard
• Create a callback request
• Contact administrator

The bot works automatically and doesn't require constant interaction.`)
                break

            case '/status':
                await sendMessage(chat.id, `✅ Connection Status:

👤 User: ${user.name}
📧 Email: ${user.email}
🔗 Telegram: Connected
📱 Chat ID: ${telegramUserId}

All notifications are active!`)
                break

            default:
                // Regular message - suggest creating a request
                await sendMessage(chat.id, `💬 Thank you for your message!

To get help:
• Create a callback request in your dashboard
• Or email us at: support@energylogic-ai.com

I will automatically notify you about all updates on your requests!`)
        }
    }
}

async function handleCallbackQuery(callbackQuery: TelegramUpdate['callback_query']) {
    if (!callbackQuery) return

    const { from, data } = callbackQuery
    const telegramUserId = from.id.toString()

    console.log(`Processing callback query from ${telegramUserId}: ${data}`)

    // Answer callback query
    await answerCallbackQuery(callbackQuery.id, 'Processed!')

    // Here you can add handling for various buttons
    if (data === 'dashboard') {
        await sendMessage(from.id, 'Go to your dashboard: https://www.energylogic-ai.com/dashboard')
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
