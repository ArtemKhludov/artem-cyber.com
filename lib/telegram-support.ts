// Utilities for working with the Telegram support bot

import { getSupabaseAdmin } from '@/lib/supabase'

export interface TelegramSupportMessage {
    userId: string
    message: string
    attachments?: string[]
    inlineKeyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>
}

/**
 * Send a message to a user via the support bot.
 */
export async function sendSupportMessage(options: TelegramSupportMessage): Promise<{ ok: boolean; error?: string }> {
    try {
        const botToken = process.env.USER_TELEGRAM_BOT_TOKEN
        if (!botToken) {
            return { ok: false, error: 'USER_TELEGRAM_BOT_TOKEN not configured' }
        }

        // Fetch user info
        const { getUserInfo } = await import('@/lib/supabase')
        const user = await getUserInfo(options.userId)

        if (!user || !user.telegram_chat_id || !user.notify_telegram_enabled) {
            return { ok: false, error: 'User not linked to Telegram or notifications disabled' }
        }

        const body: any = {
            chat_id: user.telegram_chat_id,
            text: options.message,
            parse_mode: 'HTML'
        }

        if (options.inlineKeyboard) {
            body.reply_markup = {
                inline_keyboard: options.inlineKeyboard
            }
        }

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const error = await response.text()
            return { ok: false, error: `Telegram API error: ${error}` }
        }

        return { ok: true }
    } catch (error) {
        return { ok: false, error: String(error) }
    }
}

/**
 * Send a document to the user via the support bot.
 */
export async function sendSupportDocument(userId: string, documentUrl: string, caption?: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const botToken = process.env.USER_TELEGRAM_BOT_TOKEN
        if (!botToken) {
            return { ok: false, error: 'USER_TELEGRAM_BOT_TOKEN not configured' }
        }

        // Fetch user info
        const { getUserInfo } = await import('@/lib/supabase')
        const user = await getUserInfo(userId)

        if (!user || !user.telegram_chat_id || !user.notify_telegram_enabled) {
            return { ok: false, error: 'User not linked to Telegram or notifications disabled' }
        }

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: user.telegram_chat_id,
                document: documentUrl,
                caption: caption || 'Document from EnergyLogic support'
            })
        })

        if (!response.ok) {
            const error = await response.text()
            return { ok: false, error: `Telegram API error: ${error}` }
        }

        return { ok: true }
    } catch (error) {
        return { ok: false, error: String(error) }
    }
}

/**
 * Send a receipt to the user.
 */
export async function sendReceiptToUser(userId: string, purchaseId: string, receiptUrl: string): Promise<void> {
    try {
        const supabase = getSupabaseAdmin()

        // Fetch purchase details
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('product_name, price, currency, created_at')
            .eq('id', purchaseId)
            .single()

        if (purchaseError || !purchase) {
            console.error('Failed to fetch purchase info for receipt:', purchaseError)
            return
        }

        const message = `🧾 <b>Your receipt is ready!</b>\n\n` +
            `📦 <b>Product:</b> ${purchase.product_name}\n` +
            `💰 <b>Amount:</b> ${purchase.price} ${purchase.currency || 'RUB'}\n` +
            `📅 <b>Date:</b> ${new Date(purchase.created_at).toLocaleDateString('en-US')}\n\n` +
            `Thank you for your purchase! Save the receipt for your records.`

        await sendSupportDocument(userId, receiptUrl, message)
    } catch (error) {
        console.error('Failed to send receipt:', error)
    }
}

/**
 * Send a purchase status update.
 */
export async function sendPurchaseStatusUpdate(userId: string, purchaseId: string, newStatus: string): Promise<void> {
    try {
        const supabase = getSupabaseAdmin()

        // Fetch purchase details
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('product_name, price, currency')
            .eq('id', purchaseId)
            .single()

        if (purchaseError || !purchase) {
            console.error('Failed to fetch purchase info for status update:', purchaseError)
            return
        }

        const statusEmoji = {
            'completed': '✅',
            'active': '🟢',
            'in_progress': '🟡',
            'pending': '⏳',
            'expired': '⏰',
            'revoked': '❌',
            'failed': '💥'
        }[newStatus] || '❓'

        const statusText = {
            'completed': 'Completed',
            'active': 'Active',
            'in_progress': 'Processing',
            'pending': 'Awaiting payment',
            'expired': 'Expired',
            'revoked': 'Revoked',
            'failed': 'Failed'
        }[newStatus] || newStatus

        const message = `🔄 <b>Purchase status update</b>\n\n` +
            `📦 <b>Product:</b> ${purchase.product_name}\n` +
            `💰 <b>Amount:</b> ${purchase.price} ${purchase.currency || 'RUB'}\n\n` +
            `${statusEmoji} <b>New status:</b> ${statusText}`

        await sendSupportMessage({
            userId,
            message,
            inlineKeyboard: [[
                {
                    text: '🔗 Open dashboard',
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                }
            ]]
        })
    } catch (error) {
        console.error('Failed to send purchase status update:', error)
    }
}

/**
 * Send notification about new course/material.
 */
export async function sendNewContentNotification(userId: string, courseName: string, courseUrl: string): Promise<void> {
    const message = `🎉 <b>New content is live!</b>\n\n` +
        `📚 <b>Course:</b> ${courseName}\n\n` +
        `You can start learning the new material in your dashboard.`

    await sendSupportMessage({
        userId,
        message,
        inlineKeyboard: [[
            {
                text: '📖 Open course',
                url: courseUrl
            },
            {
                text: '🏠 Dashboard',
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            }
        ]]
    })
}

/**
 * Send inactivity reminder.
 */
export async function sendInactivityReminder(userId: string, daysInactive: number): Promise<void> {
    const message = `⏰ <b>We miss you!</b>\n\n` +
        `You haven’t visited your dashboard for ${daysInactive} days.\n\n` +
        `You have unfinished courses and materials waiting for you.\n\n` +
        `Continue your learning right now!`

    await sendSupportMessage({
        userId,
        message,
        inlineKeyboard: [[
            {
                text: '🏠 Open dashboard',
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            }
        ]]
    })
}
