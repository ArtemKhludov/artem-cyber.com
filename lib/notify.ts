/*
  Lightweight notification helpers.
  - Issues-specific Telegram notifications use ISSUE_TELEGRAM_BOT_TOKEN/ISSUE_TELEGRAM_CHAT_ID.
  - Existing legacy notifications elsewhere (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) remain untouched.
*/

import { getSupabaseAdmin } from '@/lib/supabase'

type TelegramSendOptions = {
    botToken?: string
    chatId?: string
    disableWebPagePreview?: boolean
    messageThreadId?: number | string
}

export async function notifyTelegram(
    message: string,
    options: TelegramSendOptions = {}
): Promise<{ ok: boolean; status: number; error?: string }> {
    try {
        const botToken = options.botToken || process.env.TELEGRAM_BOT_TOKEN
        const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID

        if (!botToken || !chatId) {
            return { ok: false, status: 0, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' }
        }

        const body: Record<string, unknown> = {
            chat_id: chatId,
            text: message,
            disable_web_page_preview: options.disableWebPagePreview !== false
        }
        if (options.messageThreadId !== undefined) {
            body.message_thread_id = options.messageThreadId
        }

        const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!resp.ok) {
            const text = await resp.text().catch(() => '')
            return { ok: false, status: resp.status, error: text || 'Telegram request failed' }
        }

        return { ok: true, status: resp.status }
    } catch (err: any) {
        return { ok: false, status: 0, error: String(err?.message || err) }
    }
}

type IssueTelegramPayload = {
    issueId: string
    userId: string
    userEmail: string
    title: string
    description: string
    type?: string
    severity?: string
    purchaseId?: string | null
    documentId?: string | null
    url?: string | null
}

export async function notifyIssueTelegram(payload: IssueTelegramPayload): Promise<void> {
    try {
        // Use main bot for issue notifications
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const chatId = process.env.TELEGRAM_CHAT_ID
        const threadId = process.env.TELEGRAM_THREAD_ISSUES

        if (!botToken || !chatId) {
            console.warn('Telegram bot not configured for issue notifications')
            return
        }

        // Get additional data for nice formatting
        const { getUserInfo, getDocumentInfo, getPurchaseInfo } = await import('@/lib/supabase')

        let userInfo = ''
        let documentInfo = ''
        let purchaseInfo = ''

        try {
            // Get user information
            const user = await getUserInfo(payload.userId)
            if (user) {
                const name = user.name || 'No name'
                const phone = user.phone || 'No phone'
                userInfo = `👤 ${name} (${phone})`
            } else {
                userInfo = `👤 ${payload.userEmail}`
            }

            // Get document information
            if (payload.documentId) {
                const doc = await getDocumentInfo(payload.documentId)
                documentInfo = doc ? `📄 ${doc.title}` : `📄 Document ${payload.documentId}`
            }

            // Get purchase information
            if (payload.purchaseId) {
                const purchase = await getPurchaseInfo(payload.purchaseId)
                purchaseInfo = purchase ? `🛒 ${purchase.product_name} (${purchase.amount_paid} ${purchase.currency})` : `🛒 Purchase ${payload.purchaseId}`
            }
        } catch (dbError) {
            console.warn('Failed to fetch additional info for Telegram notification:', dbError)
            // Fallback to basic formatting
            userInfo = `👤 ${payload.userEmail}`
            if (payload.documentId) documentInfo = `📄 Document ${payload.documentId}`
            if (payload.purchaseId) purchaseInfo = `🛒 Purchase ${payload.purchaseId}`
        }

        const lines: string[] = []
        lines.push('🆕 New user issue')
        lines.push(`🆔 ID: ${payload.issueId}`)
        lines.push(userInfo)

        if (payload.type) {
            const typeLabels: Record<string, string> = {
                access: '🔐 Access',
                payment: '💳 Payment',
                content: '📄 Content',
                bug: '🐛 Bug',
                other: '❓ Other'
            }
            lines.push(`📋 Type: ${typeLabels[payload.type] || payload.type}`)
        }

        if (payload.severity) {
            const severityLabels: Record<string, string> = {
                low: '🟢 Low',
                normal: '🟡 Normal',
                high: '🟠 High',
                urgent: '🔴 Urgent'
            }
            lines.push(`⚡ Severity: ${severityLabels[payload.severity] || payload.severity}`)
        }

        lines.push(`📝 Title: ${payload.title}`)
        lines.push(`📄 Description: ${truncate(payload.description, 500)}`)

        if (documentInfo) lines.push(documentInfo)
        if (purchaseInfo) lines.push(purchaseInfo)
        if (payload.url) lines.push(`🔗 URL: ${payload.url}`)

        await notifyTelegram(lines.join('\n'), {
            botToken,
            chatId,
            disableWebPagePreview: true,
            messageThreadId: threadId
        })
    } catch (err) {
        // Swallow errors to avoid impacting main request flow
        console.error('notifyIssueTelegram error:', err)
    }
}

function truncate(value: string, max: number): string {
    if (!value) return ''
    if (value.length <= max) return value
    return value.slice(0, max - 1) + '...'
}
// Convenience wrappers for common streams
export async function notifyCallbackTelegram(message: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    const threadId = process.env.TELEGRAM_THREAD_CALLBACKS
    await notifyTelegram(message, { botToken, chatId, messageThreadId: threadId })
}

export async function notifyPaymentTelegram(message: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    const threadId = process.env.TELEGRAM_THREAD_PAYMENTS
    await notifyTelegram(message, { botToken, chatId, messageThreadId: threadId })
}

type EmailOptions = {
    to: string | string[]
    subject: string
    html?: string
    text?: string
    from?: string
}

export async function sendEmail(options: EmailOptions) {
    const apiKey = process.env.RESEND_API_KEY
    const sender = options.from || process.env.NOTIFY_SENDER_EMAIL || 'no-reply@energylogic-ai.com'
    if (!apiKey) return { ok: false, reason: 'no_email_env' }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: sender,
                to: Array.isArray(options.to) ? options.to : [options.to],
                subject: options.subject,
                html: options.html,
                text: options.text,
            }),
        })
        const json = await res.json().catch(() => ({}))
        return { ok: res.ok, data: json }
    } catch (e) {
        return { ok: false, reason: 'network_error' }
    }
}

export async function notifyUserEmail({
    to,
    subject,
    html,
    text
}: {
    to: string
    subject: string
    html: string
    text: string
}): Promise<void> {
    try {
        const result = await sendEmail({
            to,
            subject,
            html,
            text
        })

        if (!result.ok) {
            console.error('Email sending failed:', result.reason)
        } else {
            console.log('Email sent successfully')
        }
    } catch (error) {
        console.error('Email notification error:', error)
    }
}

// Function to send notifications to users via Telegram
export async function notifyUserTelegram(userId: string, message: string, issueId?: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const botToken = process.env.USER_TELEGRAM_BOT_TOKEN
        if (!botToken) {
            return { ok: false, error: 'USER_TELEGRAM_BOT_TOKEN not configured' }
        }

        // Get user information
        const { getUserInfo } = await import('@/lib/supabase')
        const user = await getUserInfo(userId)

        if (!user || !user.telegram_chat_id || !user.notify_telegram_enabled) {
            return { ok: false, error: 'User not linked to Telegram or notifications disabled' }
        }

        const replyMarkup = issueId ? {
            inline_keyboard: [[
                {
                    text: '💬 Open Dashboard',
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                }
            ]]
        } : undefined

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: user.telegram_chat_id,
                text: message,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
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

// Function to send notification about new reply to issue
export async function notifyUserOnReply(issueId: string, replyId: string, adminName: string, message: string): Promise<void> {
    try {
        const supabase = getSupabaseAdmin()

        // Get issue information
        const { data: issue, error: issueError } = await supabase
            .from('issue_reports')
            .select('user_id, title, user_email')
            .eq('id', issueId)
            .single()

        if (issueError || !issue) {
            console.error('Failed to fetch issue for notification:', issueError)
            return
        }

        // Get user information
        const { getUserInfo } = await import('@/lib/supabase')
        const user = await getUserInfo(issue.user_id)

        const telegramMessage = `💬 <b>New reply to your issue</b>\n\n` +
            `📝 <b>Title:</b> ${issue.title}\n` +
            `👤 <b>Replied by:</b> ${adminName}\n\n` +
            `💬 <b>Reply:</b>\n${truncate(message, 300)}\n\n` +
            `<i>To view the full reply and continue the conversation, go to your dashboard.</i>`

        // Send notifications in parallel
        const promises: Promise<any>[] = []

        // Telegram notification
        if (user?.notify_telegram_enabled) {
            promises.push(
                notifyUserTelegram(issue.user_id, telegramMessage, issueId)
                    .then(result => ({ channel: 'telegram', result }))
            )
        }

        // Email notification
        if (user?.notify_email_enabled !== false) {
            promises.push(
                sendEmail({
                    to: issue.user_email,
                    subject: `Reply to your issue: ${issue.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">New reply to your issue</h2>
                            <p>Hello!</p>
                            
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <h3 style="margin-top: 0;">Issue Title:</h3>
                                <p><strong>${issue.title}</strong></p>
                                
                                <h3>Reply from ${adminName}:</h3>
                                <p style="white-space: pre-wrap;">${message}</p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Open Dashboard
                                </a>
                            </div>
                            
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                            <p style="color: #666; font-size: 12px;">
                                This is an automatic message. To continue the conversation, go to your dashboard.
                            </p>
                        </div>
                    `,
                    text: `
New reply to your issue

Hello!

Issue Title: ${issue.title}

Reply from ${adminName}:
${message}

To view the full reply and continue the conversation, go to your dashboard:
${process.env.NEXT_PUBLIC_APP_URL}/dashboard

---
This is an automatic message.
                    `
                }).then(result => ({ channel: 'email', result }))
            )
        }

        // Wait for all notification results
        const results = await Promise.allSettled(promises)

        // Record delivery status in database
        const deliveryStatus: Record<string, any> = {}

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const { channel, result: channelResult } = result.value
                deliveryStatus[channel] = {
                    sent: channelResult.ok,
                    timestamp: new Date().toISOString(),
                    error: channelResult.error || channelResult.reason
                }
            }
        })

        // Update delivery status in issue_replies
        await supabase
            .from('issue_replies')
            .update({ delivery_status: deliveryStatus })
            .eq('id', replyId)

    } catch (error) {
        console.error('notifyUserOnReply error:', error)
    }
}

