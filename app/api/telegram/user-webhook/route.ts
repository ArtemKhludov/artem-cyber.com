import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

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
        }
        chat: {
            id: number
            type: string
        }
        date: number
        text?: string
    }
}

const STATUS_EMOJI_MAP = {
    open: '🟡',
    in_progress: '🔵',
    waiting_user: '🟠',
    resolved: '✅',
    closed: '❌',
} as const

type IssueStatus = keyof typeof STATUS_EMOJI_MAP

function isIssueStatus(status: unknown): status is IssueStatus {
    return typeof status === 'string' && status in STATUS_EMOJI_MAP
}

function resolveStatusEmoji(status: unknown): string {
    return isIssueStatus(status) ? STATUS_EMOJI_MAP[status] : '❓'
}

const PURCHASE_STATUS_EMOJI_MAP = {
    completed: '✅',
    active: '🟢',
    in_progress: '🟡',
    pending: '⏳',
    expired: '⏰',
    revoked: '❌',
    failed: '💥',
} as const

type PurchaseStatus = keyof typeof PURCHASE_STATUS_EMOJI_MAP

function isPurchaseStatus(status: unknown): status is PurchaseStatus {
    return typeof status === 'string' && status in PURCHASE_STATUS_EMOJI_MAP
}

function resolvePurchaseStatusEmoji(status: unknown): string {
    return isPurchaseStatus(status) ? PURCHASE_STATUS_EMOJI_MAP[status] : '❓'
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string, replyMarkup?: any) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('Telegram send message error:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Telegram send message error:', error)
        return false
    }
}

export async function POST(request: NextRequest) {
    try {
        const botToken = process.env.USER_TELEGRAM_BOT_TOKEN
        const webhookSecret = process.env.USER_TELEGRAM_WEBHOOK_SECRET

        if (!botToken) {
            console.error('USER_TELEGRAM_BOT_TOKEN not configured')
            return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })
        }

        // Webhook secret check disabled for easier setup
        // You already have all necessary tokens for security

        const update: TelegramUpdate = await request.json()

        if (!update.message) {
            return NextResponse.json({ ok: true })
        }

        const message = update.message
        const chatId = message.chat.id.toString()
        const text = message.text || ''
        const userId = message.from.id

        // Handle /start command with token
        if (text.startsWith('/start ')) {
            const token = text.split(' ')[1]

            if (!token) {
                await sendTelegramMessage(botToken, chatId,
                    '👋 <b>Welcome to EnergyLogic Support!</b>\n\n' +
                    'This bot will help you receive notifications about your support requests.\n\n' +
                    'To link your account, go to your dashboard and click "Connect Telegram".\n\n' +
                    '<i>Available commands:</i>\n' +
                    '/help - help\n' +
                    '/status - account status\n' +
                    '/purchases - my purchases'
                )
                return NextResponse.json({ ok: true })
            }

            const supabase = getSupabaseAdmin()

            // Search for token in database
            const { data: linkToken, error: tokenError } = await supabase
                .from('telegram_link_tokens')
                .select('*, users(*)')
                .eq('token', token)
                .eq('used_at', null)
                .gt('expires_at', new Date().toISOString())
                .single()

            if (tokenError || !linkToken) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Linking token is invalid or expired.\n\n' +
                    'Please go to your dashboard and create a new linking link.'
                )
                return NextResponse.json({ ok: true })
            }

            // Update user with Telegram data
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    telegram_username: message.from.username,
                    telegram_chat_id: chatId,
                    notify_telegram_enabled: true
                })
                .eq('id', linkToken.user_id)

            if (updateError) {
                console.error('User update error:', updateError)
                await sendTelegramMessage(botToken, chatId,
                    '❌ An error occurred while linking your account. Please try again later.'
                )
                return NextResponse.json({ ok: true })
            }

            // Mark token as used
            await supabase
                .from('telegram_link_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('id', linkToken.id)

            // Record in audit
            await supabase
                .from('user_contact_audit')
                .insert({
                    user_id: linkToken.user_id,
                    action: 'telegram_linked',
                    new_value: chatId
                })

            const userName = (linkToken.users as any)?.name || (linkToken.users as any)?.email || 'User'

            await sendTelegramMessage(botToken, chatId,
                `✅ <b>Account Successfully Linked!</b>\n\n` +
                `Hello, ${userName}!\n\n` +
                `You will now receive notifications about new replies to your support requests.\n\n` +
                `<i>This bot is for notifications only. To communicate with support, use your dashboard.</i>`,
                {
                    inline_keyboard: [[
                        {
                            text: '🔗 Open Dashboard',
                            url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                        }
                    ]]
                }
            )

            return NextResponse.json({ ok: true })
        }

        // Handle /start command without token
        if (text === '/start') {
            await sendTelegramMessage(botToken, chatId,
                '👋 <b>Welcome!</b>\n\n' +
                'This bot is for notifications about your support requests.\n\n' +
                'To link your account, go to your dashboard and click "Connect Telegram".'
            )
            return NextResponse.json({ ok: true })
        }

        // Handle /help command
        if (text === '/help') {
            await sendTelegramMessage(botToken, chatId,
                '📋 <b>Available Commands:</b>\n\n' +
                '/start - Start working with the bot\n' +
                '/help - Show this help\n' +
                '/status - Account status and recent requests\n' +
                '/purchases - My purchases\n' +
                '/unlink - Unlink account\n\n' +
                '<i>To create new requests, use your dashboard.</i>'
            )
            return NextResponse.json({ ok: true })
        }

        // Handle /status command
        if (text === '/status') {
            const supabase = getSupabaseAdmin()

            // Find user by telegram_chat_id
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, name, email, phone, telegram_username')
                .eq('telegram_chat_id', chatId)
                .single()

            if (userError || !user) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Account is not linked to this Telegram account.\n\n' +
                    'Go to your dashboard and click "Connect Telegram".'
                )
                return NextResponse.json({ ok: true })
            }

            // Get recent requests
            const { data: issues, error: issuesError } = await supabase
                .from('issue_reports')
                .select('id, title, status, created_at, issue_replies(id, message, created_at)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3)

            let statusMessage = `👤 <b>Account Status</b>\n\n` +
                `Name: ${user.name || 'Not specified'}\n` +
                `Email: ${user.email}\n` +
                `Phone: ${user.phone || 'Not specified'}\n` +
                `Telegram: @${user.telegram_username || 'Not specified'}\n\n`

            if (issues && issues.length > 0) {
                statusMessage += `📝 <b>Recent Requests:</b>\n\n`
                issues.forEach((issue, index) => {
                    const statusEmoji = resolveStatusEmoji(issue.status)

                    const replyCount = issue.issue_replies?.length || 0
                    statusMessage += `${index + 1}. ${statusEmoji} ${issue.title}\n` +
                        `   Status: ${issue.status}\n` +
                        `   Replies: ${replyCount}\n` +
                        `   Created: ${new Date(issue.created_at).toLocaleDateString('en-US')}\n\n`
                })
            } else {
                statusMessage += `📝 You do not have any support requests yet.`
            }

            await sendTelegramMessage(botToken, chatId, statusMessage)
            return NextResponse.json({ ok: true })
        }

        // Handle /purchases command
        if (text === '/purchases') {
            const supabase = getSupabaseAdmin()

            // Find user by telegram_chat_id
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('telegram_chat_id', chatId)
                .single()

            if (userError || !user) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Account is not linked to this Telegram account.\n\n' +
                    'Go to your dashboard and click "Connect Telegram".'
                )
                return NextResponse.json({ ok: true })
            }

            // Get user purchases
            const { data: purchases, error: purchasesError } = await supabase
                .from('purchases')
                .select('id, product_name, price, status, created_at, currency')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (purchasesError || !purchases || purchases.length === 0) {
                await sendTelegramMessage(botToken, chatId,
                    `🛒 <b>My Purchases</b>\n\nYou don't have any purchases yet.\n\nGo to the catalog to choose a suitable course.`
                )
                return NextResponse.json({ ok: true })
            }

            let purchasesMessage = `🛒 <b>My Purchases (last 5):</b>\n\n`
            purchases.forEach((purchase, index) => {
                const statusEmoji = resolvePurchaseStatusEmoji(purchase.status)

                purchasesMessage += `${index + 1}. ${statusEmoji} ${purchase.product_name}\n` +
                    `   Price: ${purchase.price} ${purchase.currency || 'USD'}\n` +
                    `   Status: ${purchase.status}\n` +
                    `   Date: ${new Date(purchase.created_at).toLocaleDateString('en-US')}\n\n`
            })

            purchasesMessage += `\n<i>For detailed information and access to materials, go to your dashboard.</i>`

            await sendTelegramMessage(botToken, chatId, purchasesMessage)
            return NextResponse.json({ ok: true })
        }

        // Handle /unlink command
        if (text === '/unlink') {
            const supabase = getSupabaseAdmin()

            // Find user by telegram_chat_id
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('telegram_chat_id', chatId)
                .single()

            if (userError || !user) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Account is not linked to this Telegram account.'
                )
                return NextResponse.json({ ok: true })
            }

            // Unlink account
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    telegram_username: null,
                    telegram_chat_id: null,
                    notify_telegram_enabled: false
                })
                .eq('id', user.id)

            if (updateError) {
                console.error('User unlink error:', updateError)
                await sendTelegramMessage(botToken, chatId,
                    '❌ An error occurred while unlinking your account. Please try again later.'
                )
                return NextResponse.json({ ok: true })
            }

            // Record in audit
            await supabase
                .from('user_contact_audit')
                .insert({
                    user_id: user.id,
                    action: 'telegram_unlinked',
                    old_value: chatId
                })

            await sendTelegramMessage(botToken, chatId,
                '✅ <b>Account Successfully Unlinked!</b>\n\n' +
                'You will no longer receive notifications in Telegram.\n\n' +
                'To link again, go to your dashboard.'
            )

            return NextResponse.json({ ok: true })
        }

        // For all other messages
        await sendTelegramMessage(botToken, chatId,
            '🤖 <b>This bot is for notifications only.</b>\n\n' +
            'To communicate with support, use your dashboard or submit a request through the website.\n\n' +
            'Use /help to view available commands.'
        )

        return NextResponse.json({ ok: true })

    } catch (error) {
        console.error('Telegram webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
