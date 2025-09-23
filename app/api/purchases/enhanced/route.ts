import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyPaymentTelegram } from '@/lib/notify'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Уведомления в Payments-тему
async function sendTelegramNotification(message: string) {
    await notifyPaymentTelegram(message)
}

// Создание покупки с автоматическим связыванием пользователя
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            name,
            phone,
            email,
            product_name,
            product_type,
            amount,
            currency = 'RUB',
            payment_method,
            status = 'pending',
            notes,
            source = 'manual'
        } = body

        // Валидация обязательных полей
        if (!name || !phone || !product_name || !amount) {
            return NextResponse.json(
                { error: 'Имя, телефон, название продукта и сумма обязательны' },
                { status: 400 }
            )
        }

        // Нормализация данных
        const normalizedPhone = phone.trim()
        const normalizedEmail = email ? email.trim().toLowerCase() : null
        const normalizedName = name.trim()

        // Валидация формата телефона
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
        if (!phoneRegex.test(normalizedPhone)) {
            return NextResponse.json(
                { error: 'Неверный формат телефона' },
                { status: 400 }
            )
        }

        // Валидация формата email
        if (normalizedEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(normalizedEmail)) {
                return NextResponse.json(
                    { error: 'Неверный формат email' },
                    { status: 400 }
                )
            }
        }

        // Валидация суммы
        const numericAmount = parseFloat(amount)
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json(
                { error: 'Сумма должна быть положительным числом' },
                { status: 400 }
            )
        }

        // Создаем покупку - триггер автоматически создаст/найдет пользователя
        const { data, error } = await supabase
            .from('purchase_requests')
            .insert([
                {
                    name: normalizedName,
                    phone: normalizedPhone,
                    email: normalizedEmail,
                    product_name: product_name.trim(),
                    product_type: product_type || 'product',
                    amount: numericAmount,
                    currency: currency,
                    payment_method: payment_method || 'unknown',
                    status: status,
                    notes: notes?.trim() || null,
                    source: source
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Ошибка создания покупки', details: error.message },
                { status: 500 }
            )
        }

        // Отправка уведомления в Telegram
        const telegramMessage = `🛒 Новая покупка из CRM-системы:
👤 Имя: ${normalizedName}
📧 Email: ${normalizedEmail || 'Не указан'}
📞 Телефон: ${normalizedPhone}
📦 Тип товара: ${product_type || 'product'}
🛍️ Название: ${product_name}
💰 Сумма: ${numericAmount} ${currency}
💳 Способ оплаты: ${payment_method || 'unknown'}
📝 Статус: ${status}
📝 Заметки: ${notes || 'Нет'}
🌐 Источник: ${source}
🆔 ID покупки: ${data.id}`

        await sendTelegramNotification(telegramMessage)

        return NextResponse.json({
            success: true,
            message: 'Покупка успешно создана',
            data: data
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

// Получение покупок с информацией о пользователях
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const userId = searchParams.get('userId')
        const status = searchParams.get('status')

        let query = supabase
            .from('purchase_requests')
            .select(`
                *,
                crm_users!inner(
                    id,
                    name,
                    phone,
                    email,
                    total_purchases,
                    total_spent
                )
            `)
            .order('created_at', { ascending: false })

        // Фильтрация по пользователю
        if (userId) {
            query = query.eq('user_id', userId)
        }

        // Фильтрация по статусу
        if (status) {
            query = query.eq('status', status)
        }

        // Пагинация
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Ошибка получения данных покупок' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            count: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
