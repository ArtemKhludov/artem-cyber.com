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

        // Проверяем webhook secret если настроен
        if (webhookSecret) {
            const secret = request.headers.get('x-telegram-bot-api-secret-token')
            if (secret !== webhookSecret) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const update: TelegramUpdate = await request.json()

        if (!update.message) {
            return NextResponse.json({ ok: true })
        }

        const message = update.message
        const chatId = message.chat.id.toString()
        const text = message.text || ''
        const userId = message.from.id

        // Обрабатываем команду /start с токеном
        if (text.startsWith('/start ')) {
            const token = text.split(' ')[1]

            if (!token) {
                await sendTelegramMessage(botToken, chatId,
                    '👋 <b>Добро пожаловать в EnergyLogic Support!</b>\n\n' +
                    'Этот бот поможет вам получать уведомления о ваших обращениях в поддержку.\n\n' +
                    'Для связывания аккаунта перейдите в личный кабинет и нажмите "Подключить Telegram".\n\n' +
                    '<i>Доступные команды:</i>\n' +
                    '/help - справка\n' +
                    '/status - статус аккаунта\n' +
                    '/purchases - мои покупки'
                )
                return NextResponse.json({ ok: true })
            }

            const supabase = getSupabaseAdmin()

            // Ищем токен в базе данных
            const { data: linkToken, error: tokenError } = await supabase
                .from('telegram_link_tokens')
                .select('*, users(*)')
                .eq('token', token)
                .eq('used_at', null)
                .gt('expires_at', new Date().toISOString())
                .single()

            if (tokenError || !linkToken) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Токен связывания недействителен или истек.\n\n' +
                    'Пожалуйста, перейдите в личный кабинет и создайте новую ссылку для связывания.'
                )
                return NextResponse.json({ ok: true })
            }

            // Обновляем пользователя с данными Telegram
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
                    '❌ Произошла ошибка при связывании аккаунта. Попробуйте позже.'
                )
                return NextResponse.json({ ok: true })
            }

            // Отмечаем токен как использованный
            await supabase
                .from('telegram_link_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('id', linkToken.id)

            // Записываем в аудит
            await supabase
                .from('user_contact_audit')
                .insert({
                    user_id: linkToken.user_id,
                    action: 'telegram_linked',
                    new_value: chatId
                })

            const userName = (linkToken.users as any)?.name || (linkToken.users as any)?.email || 'Пользователь'

            await sendTelegramMessage(botToken, chatId,
                `✅ <b>Аккаунт успешно связан!</b>\n\n` +
                `Привет, ${userName}!\n\n` +
                `Теперь вы будете получать уведомления о новых ответах на ваши обращения в поддержку.\n\n` +
                `<i>Этот бот предназначен только для уведомлений. Для общения с поддержкой используйте личный кабинет.</i>`,
                {
                    inline_keyboard: [[
                        {
                            text: '🔗 Открыть личный кабинет',
                            url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                        }
                    ]]
                }
            )

            return NextResponse.json({ ok: true })
        }

        // Обрабатываем команду /start без токена
        if (text === '/start') {
            await sendTelegramMessage(botToken, chatId,
                '👋 <b>Добро пожаловать!</b>\n\n' +
                'Этот бот предназначен для уведомлений о ваших обращениях в поддержку.\n\n' +
                'Для связывания аккаунта перейдите в личный кабинет и нажмите "Подключить Telegram".'
            )
            return NextResponse.json({ ok: true })
        }

        // Обрабатываем команду /help
        if (text === '/help') {
            await sendTelegramMessage(botToken, chatId,
                '📋 <b>Доступные команды:</b>\n\n' +
                '/start - Начать работу с ботом\n' +
                '/help - Показать эту справку\n' +
                '/status - Статус аккаунта и последние обращения\n' +
                '/purchases - Мои покупки\n' +
                '/unlink - Отвязать аккаунт\n\n' +
                '<i>Для создания новых обращений используйте личный кабинет.</i>'
            )
            return NextResponse.json({ ok: true })
        }

        // Обрабатываем команду /status
        if (text === '/status') {
            const supabase = getSupabaseAdmin()

            // Находим пользователя по telegram_chat_id
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, name, email, phone, telegram_username')
                .eq('telegram_chat_id', chatId)
                .single()

            if (userError || !user) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Аккаунт не связан с этим Telegram аккаунтом.\n\n' +
                    'Перейдите в личный кабинет и нажмите "Подключить Telegram".'
                )
                return NextResponse.json({ ok: true })
            }

            // Получаем последние обращения
            const { data: issues, error: issuesError } = await supabase
                .from('issue_reports')
                .select('id, title, status, created_at, issue_replies(id, message, created_at)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3)

            let statusMessage = `👤 <b>Статус аккаунта</b>\n\n` +
                `Имя: ${user.name || 'Не указано'}\n` +
                `Email: ${user.email}\n` +
                `Телефон: ${user.phone || 'Не указан'}\n` +
                `Telegram: @${user.telegram_username || 'Не указан'}\n\n`

            if (issues && issues.length > 0) {
                statusMessage += `📝 <b>Последние обращения:</b>\n\n`
                issues.forEach((issue, index) => {
                    const statusEmoji = resolveStatusEmoji(issue.status)

                    const replyCount = issue.issue_replies?.length || 0
                    statusMessage += `${index + 1}. ${statusEmoji} ${issue.title}\n` +
                        `   Статус: ${issue.status}\n` +
                        `   Ответов: ${replyCount}\n` +
                        `   Создано: ${new Date(issue.created_at).toLocaleDateString('ru-RU')}\n\n`
                })
            } else {
                statusMessage += `📝 У вас пока нет обращений в поддержку.`
            }

            await sendTelegramMessage(botToken, chatId, statusMessage)
            return NextResponse.json({ ok: true })
        }

        // Обрабатываем команду /purchases
        if (text === '/purchases') {
            const supabase = getSupabaseAdmin()

            // Находим пользователя по telegram_chat_id
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('telegram_chat_id', chatId)
                .single()

            if (userError || !user) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Аккаунт не связан с этим Telegram аккаунтом.\n\n' +
                    'Перейдите в личный кабинет и нажмите "Подключить Telegram".'
                )
                return NextResponse.json({ ok: true })
            }

            // Получаем покупки пользователя
            const { data: purchases, error: purchasesError } = await supabase
                .from('purchases')
                .select('id, product_name, price, status, created_at, currency')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (purchasesError || !purchases || purchases.length === 0) {
                await sendTelegramMessage(botToken, chatId,
                    '🛒 <b>Мои покупки</b>\n\n' +
                    'У вас пока нет покупок.\n\n' +
                    'Перейдите в каталог, чтобы выбрать подходящий курс.'
                )
                return NextResponse.json({ ok: true })
            }

            let purchasesMessage = `🛒 <b>Мои покупки (последние 5):</b>\n\n`
            purchases.forEach((purchase, index) => {
                const statusEmoji = resolvePurchaseStatusEmoji(purchase.status)

                purchasesMessage += `${index + 1}. ${statusEmoji} ${purchase.product_name}\n` +
                    `   Цена: ${purchase.price} ${purchase.currency || 'RUB'}\n` +
                    `   Статус: ${purchase.status}\n` +
                    `   Дата: ${new Date(purchase.created_at).toLocaleDateString('ru-RU')}\n\n`
            })

            purchasesMessage += `\n<i>Для подробной информации и доступа к материалам перейдите в личный кабинет.</i>`

            await sendTelegramMessage(botToken, chatId, purchasesMessage)
            return NextResponse.json({ ok: true })
        }

        // Обрабатываем команду /unlink
        if (text === '/unlink') {
            const supabase = getSupabaseAdmin()

            // Находим пользователя по telegram_chat_id
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('telegram_chat_id', chatId)
                .single()

            if (userError || !user) {
                await sendTelegramMessage(botToken, chatId,
                    '❌ Аккаунт не связан с этим Telegram аккаунтом.'
                )
                return NextResponse.json({ ok: true })
            }

            // Отвязываем аккаунт
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
                    '❌ Произошла ошибка при отвязывании аккаунта. Попробуйте позже.'
                )
                return NextResponse.json({ ok: true })
            }

            // Записываем в аудит
            await supabase
                .from('user_contact_audit')
                .insert({
                    user_id: user.id,
                    action: 'telegram_unlinked',
                    old_value: chatId
                })

            await sendTelegramMessage(botToken, chatId,
                '✅ <b>Аккаунт успешно отвязан!</b>\n\n' +
                'Вы больше не будете получать уведомления в Telegram.\n\n' +
                'Для повторного связывания перейдите в личный кабинет.'
            )

            return NextResponse.json({ ok: true })
        }

        // Для всех остальных сообщений
        await sendTelegramMessage(botToken, chatId,
            '🤖 <b>Этот бот предназначен только для уведомлений.</b>\n\n' +
            'Для общения с поддержкой используйте личный кабинет или отправьте обращение через сайт.\n\n' +
            'Используйте /help для просмотра доступных команд.'
        )

        return NextResponse.json({ ok: true })

    } catch (error) {
        console.error('Telegram webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
