// Функции для работы с Telegram ботом поддержки

import { getSupabaseAdmin } from '@/lib/supabase'

export interface TelegramSupportMessage {
    userId: string
    message: string
    attachments?: string[]
    inlineKeyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>
}

/**
 * Отправляет сообщение пользователю через бота поддержки
 */
export async function sendSupportMessage(options: TelegramSupportMessage): Promise<{ ok: boolean; error?: string }> {
    try {
        const botToken = process.env.USER_TELEGRAM_BOT_TOKEN
        if (!botToken) {
            return { ok: false, error: 'USER_TELEGRAM_BOT_TOKEN not configured' }
        }

        // Получаем информацию о пользователе
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
 * Отправляет документ пользователю через бота поддержки
 */
export async function sendSupportDocument(userId: string, documentUrl: string, caption?: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const botToken = process.env.USER_TELEGRAM_BOT_TOKEN
        if (!botToken) {
            return { ok: false, error: 'USER_TELEGRAM_BOT_TOKEN not configured' }
        }

        // Получаем информацию о пользователе
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
                caption: caption || 'Документ от поддержки EnergyLogic'
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
 * Отправляет чек пользователю
 */
export async function sendReceiptToUser(userId: string, purchaseId: string, receiptUrl: string): Promise<void> {
    try {
        const supabase = getSupabaseAdmin()

        // Получаем информацию о покупке
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('product_name, price, currency, created_at')
            .eq('id', purchaseId)
            .single()

        if (purchaseError || !purchase) {
            console.error('Failed to fetch purchase info for receipt:', purchaseError)
            return
        }

        const message = `🧾 <b>Ваш чек готов!</b>\n\n` +
            `📦 <b>Товар:</b> ${purchase.product_name}\n` +
            `💰 <b>Сумма:</b> ${purchase.price} ${purchase.currency || 'RUB'}\n` +
            `📅 <b>Дата:</b> ${new Date(purchase.created_at).toLocaleDateString('ru-RU')}\n\n` +
            `Спасибо за покупку! Сохраните чек для отчетности.`

        await sendSupportDocument(userId, receiptUrl, message)
    } catch (error) {
        console.error('Failed to send receipt:', error)
    }
}

/**
 * Отправляет уведомление об изменении статуса покупки
 */
export async function sendPurchaseStatusUpdate(userId: string, purchaseId: string, newStatus: string): Promise<void> {
    try {
        const supabase = getSupabaseAdmin()

        // Получаем информацию о покупке
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
            'completed': 'Завершена',
            'active': 'Активна',
            'in_progress': 'В обработке',
            'pending': 'Ожидает оплаты',
            'expired': 'Истекла',
            'revoked': 'Отозвана',
            'failed': 'Не удалась'
        }[newStatus] || newStatus

        const message = `🔄 <b>Обновление статуса покупки</b>\n\n` +
            `📦 <b>Товар:</b> ${purchase.product_name}\n` +
            `💰 <b>Сумма:</b> ${purchase.price} ${purchase.currency || 'RUB'}\n\n` +
            `${statusEmoji} <b>Новый статус:</b> ${statusText}`

        await sendSupportMessage({
            userId,
            message,
            inlineKeyboard: [[
                {
                    text: '🔗 Открыть в личном кабинете',
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                }
            ]]
        })
    } catch (error) {
        console.error('Failed to send purchase status update:', error)
    }
}

/**
 * Отправляет уведомление о новом курсе/материале
 */
export async function sendNewContentNotification(userId: string, courseName: string, courseUrl: string): Promise<void> {
    const message = `🎉 <b>Новый контент доступен!</b>\n\n` +
        `📚 <b>Курс:</b> ${courseName}\n\n` +
        `Теперь вы можете изучать новый материал в своем личном кабинете.`

    await sendSupportMessage({
        userId,
        message,
        inlineKeyboard: [[
            {
                text: '📖 Открыть курс',
                url: courseUrl
            },
            {
                text: '🏠 Личный кабинет',
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            }
        ]]
    })
}

/**
 * Отправляет напоминание о неактивности
 */
export async function sendInactivityReminder(userId: string, daysInactive: number): Promise<void> {
    const message = `⏰ <b>Мы скучаем по вам!</b>\n\n` +
        `Вы не заходили в личный кабинет уже ${daysInactive} дней.\n\n` +
        `У вас есть неоконченные курсы и материалы, которые ждут изучения.\n\n` +
        `Продолжите свое обучение прямо сейчас!`

    await sendSupportMessage({
        userId,
        message,
        inlineKeyboard: [[
            {
                text: '🏠 Открыть личный кабинет',
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            }
        ]]
    })
}
