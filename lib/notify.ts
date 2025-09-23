/*
  Lightweight notification helpers.
  - Issues-specific Telegram notifications use ISSUE_TELEGRAM_BOT_TOKEN/ISSUE_TELEGRAM_CHAT_ID.
  - Existing legacy notifications elsewhere (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) remain untouched.
*/

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
        const enabled = String(process.env.NOTIFY_ISSUES_VIA_TELEGRAM || '').toLowerCase() === 'true'
        if (!enabled) return

        const issueBotToken = process.env.ISSUE_TELEGRAM_BOT_TOKEN
        const issueChatId = process.env.ISSUE_TELEGRAM_CHAT_ID
        const issueThreadId = process.env.ISSUE_TELEGRAM_THREAD_ID || process.env.ISSUE_TELEGRAM_THREAD_COURSE_ISSUES
        const allowFallback = String(process.env.ISSUE_TELEGRAM_FALLBACK_TO_GENERAL || '') === 'true'

        const botToken = issueBotToken || (allowFallback ? process.env.TELEGRAM_BOT_TOKEN : undefined)
        const chatId = issueChatId || (allowFallback ? process.env.TELEGRAM_CHAT_ID : undefined)

        if (!botToken || !chatId) return

        // Получаем дополнительные данные для красивого форматирования
        const { getUserInfo, getDocumentInfo, getPurchaseInfo } = await import('@/lib/supabase')

        let userInfo = ''
        let documentInfo = ''
        let purchaseInfo = ''

        try {
            // Получаем информацию о пользователе
            const user = await getUserInfo(payload.userId)
            userInfo = user ? `👤 ${user.name || 'Без имени'} (${user.phone || 'Без телефона'})` : `👤 ${payload.userEmail}`

            // Получаем информацию о документе
            if (payload.documentId) {
                const doc = await getDocumentInfo(payload.documentId)
                documentInfo = doc ? `📄 ${doc.title}` : `📄 Документ ${payload.documentId}`
            }

            // Получаем информацию о покупке
            if (payload.purchaseId) {
                const purchase = await getPurchaseInfo(payload.purchaseId)
                purchaseInfo = purchase ? `🛒 ${purchase.product_name} (${purchase.amount_paid} ${purchase.currency})` : `🛒 Покупка ${payload.purchaseId}`
            }
        } catch (dbError) {
            console.warn('Failed to fetch additional info for Telegram notification:', dbError)
            // Fallback к базовому форматированию
            userInfo = `👤 ${payload.userEmail}`
            if (payload.documentId) documentInfo = `📄 Документ ${payload.documentId}`
            if (payload.purchaseId) purchaseInfo = `🛒 Покупка ${payload.purchaseId}`
        }

        const lines: string[] = []
        lines.push('🆕 Новое обращение пользователя')
        lines.push(`🆔 ID: ${payload.issueId}`)
        lines.push(userInfo)

        if (payload.type) {
            const typeLabels: Record<string, string> = {
                access: '🔐 Доступ',
                payment: '💳 Оплата',
                content: '📄 Контент',
                bug: '🐛 Ошибка',
                other: '❓ Другое'
            }
            lines.push(`📋 Тип: ${typeLabels[payload.type] || payload.type}`)
        }

        if (payload.severity) {
            const severityLabels: Record<string, string> = {
                low: '🟢 Низкая',
                normal: '🟡 Нормальная',
                high: '🟠 Высокая',
                urgent: '🔴 Критичная'
            }
            lines.push(`⚡ Важность: ${severityLabels[payload.severity] || payload.severity}`)
        }

        lines.push(`📝 Тема: ${payload.title}`)
        lines.push(`📄 Описание: ${truncate(payload.description, 500)}`)

        if (documentInfo) lines.push(documentInfo)
        if (purchaseInfo) lines.push(purchaseInfo)
        if (payload.url) lines.push(`🔗 URL: ${payload.url}`)

        await notifyTelegram(lines.join('\n'), {
            botToken,
            chatId,
            disableWebPagePreview: true,
            messageThreadId: issueThreadId
        })
    } catch (err) {
        // Swallow errors to avoid impacting main request flow
        console.error('notifyIssueTelegram error:', err)
    }
}

function truncate(value: string, max: number): string {
    if (!value) return ''
    if (value.length <= max) return value
    return value.slice(0, max - 1) + '…'
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
    const sender = options.from || process.env.NOTIFY_SENDER_EMAIL || 'no-reply@example.com'
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


