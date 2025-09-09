import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()

        const { data: documents, error } = await supabase
            .from('documents')
            .select('id, title, price_rub, price')
            .order('title')

        if (error) {
            console.error('Error fetching pricing:', error)
            return NextResponse.json({ error: 'Ошибка получения цен' }, { status: 500 })
        }

        return NextResponse.json({ documents })
    } catch (error) {
        console.error('Pricing API error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { updates } = body // массив обновлений [{ id, price_rub }, ...]

        if (!updates || !Array.isArray(updates)) {
            return NextResponse.json({ error: 'Необходим массив обновлений' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const results = []

        for (const update of updates) {
            const { id, price_rub } = update

            if (!id || !price_rub) {
                results.push({ id, error: 'Необходимы поля id и price_rub' })
                continue
            }

            const { data: document, error } = await supabase
                .from('documents')
                .update({
                    price_rub: parseInt(price_rub),
                    price: parseInt(price_rub) // дублирование для совместимости
                })
                .eq('id', id)
                .select('id, title, price_rub')
                .single()

            if (error) {
                console.error(`Error updating price for document ${id}:`, error)
                results.push({ id, error: 'Ошибка обновления цены' })
            } else {
                results.push({ id, success: true, document })
            }
        }

        // Отправка уведомления в Telegram
        try {
            const successCount = results.filter(r => r.success).length
            const errorCount = results.filter(r => r.error).length

            const telegramMessage = `💰 Обновление цен завершено:
✅ Успешно обновлено: ${successCount}
❌ Ошибок: ${errorCount}
📅 Дата: ${new Date().toLocaleString('ru-RU')}`

            const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: telegramMessage,
                    parse_mode: 'HTML'
                })
            })

            if (!response.ok) {
                console.error('Telegram notification failed:', await response.text())
            } else {
                console.log('✅ Telegram уведомление отправлено')
            }
        } catch (telegramError) {
            console.error('Telegram error:', telegramError)
        }

        return NextResponse.json({ results })
    } catch (error) {
        console.error('Update pricing API error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
