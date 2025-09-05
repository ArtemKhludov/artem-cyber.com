import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        // Конкретные цены для обновления (используем точные названия из базы)
        const pricingUpdates = [
            {
                title: "EnergyLogic: Искусство Перекалибровки Реальности",
                price: 2990,
                price_rub: 2990
            },
            {
                title: "Карта Самопознания: Когда Я Ничего Не Понимаю",
                price: 1990,
                price_rub: 1990
            },
            {
                title: "Нейробиология эмоций: биологические основы и методы синхронизации",
                price: 2490,
                price_rub: 2490
            },
            {
                title: "Распознавание внешних сценариев: Инструменты самонаблюдения",
                price: 3490,
                price_rub: 3490
            },
            {
                title: "Настраиваемая реальность: метафизическая модель сознания",
                price: 3990,
                price_rub: 3990
            },
            {
                title: "Квантовая Архитектура Намерения: Метод Сознательной Перезаписи Реальности",
                price: 4990,
                price_rub: 4990
            }
        ]

        const results = []

        for (const update of pricingUpdates) {
            const { data, error } = await supabase
                .from('documents')
                .update({
                    price: update.price,
                    price_rub: update.price_rub
                })
                .eq('title', update.title)
                .select()

            if (error) {
                console.error(`Error updating ${update.title}:`, error)
                results.push({ title: update.title, success: false, error: error.message })
            } else {
                results.push({ title: update.title, success: true, updated: data })
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Цены обновлены',
            results
        })

    } catch (error) {
        console.error('Update pricing error:', error)
        return NextResponse.json(
            { error: 'Ошибка обновления цен' },
            { status: 500 }
        )
    }
}
