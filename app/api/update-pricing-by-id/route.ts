import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        // Конкретные цены для обновления по ID
        const pricingUpdates = [
            {
                id: "84f1cc74-936a-4bb7-8dba-33fea9d515be",
                title: "EnergyLogic: Искусство Перекалибровки Реальности",
                price: 2990,
                price_rub: 2990
            },
            {
                id: "5080ac5b-e820-494f-88b3-0490b520db7f",
                title: "Карта Самопознания: Когда Я Ничего Не Понимаю",
                price: 1990,
                price_rub: 1990
            },
            {
                id: "811a76b4-18d9-458a-a6f9-9072687f8ea2",
                title: "Нейробиология эмоций: биологические основы и методы синхронизации",
                price: 2490,
                price_rub: 2490
            },
            {
                id: "5e677c76-1818-4adc-850a-4352c9e36196",
                title: "Распознавание внешних сценариев: Инструменты самонаблюдения",
                price: 3490,
                price_rub: 3490
            },
            {
                id: "96736874-7846-4af7-a2ef-a9cd3ff2b676",
                title: "Настраиваемая реальность: метафизическая модель сознания",
                price: 3990,
                price_rub: 3990
            },
            {
                id: "7b3e63f4-45fb-44a3-93cd-ff4abeead3e4",
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
                .eq('id', update.id)
                .select()

            if (error) {
                console.error(`Error updating ${update.title}:`, error)
                results.push({ id: update.id, title: update.title, success: false, error: error.message })
            } else {
                results.push({ id: update.id, title: update.title, success: true, updated: data })
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Цены обновлены по ID',
            results
        })

    } catch (error) {
        console.error('Update pricing by ID error:', error)
        return NextResponse.json(
            { error: 'Ошибка обновления цен' },
            { status: 500 }
        )
    }
}
