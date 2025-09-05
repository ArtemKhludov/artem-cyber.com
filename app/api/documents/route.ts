import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PDF_DOCUMENTS } from '@/lib/pricing'

export async function GET(request: NextRequest) {
    try {
        // Получаем документы из базы данных
        const { data: dbDocuments, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching documents:', error)
            return NextResponse.json(
                { error: 'Ошибка получения документов' },
                { status: 500 }
            )
        }

        // Объединяем данные из базы с конфигурацией цен
        const documentsWithPricing = (dbDocuments || []).map(dbDoc => {
            // Ищем соответствующий документ в конфигурации цен
            const pricingDoc = PDF_DOCUMENTS.find(pdf =>
                pdf.title === dbDoc.title ||
                pdf.id === dbDoc.id
            )

            return {
                ...dbDoc,
                // Используем цены из конфигурации, если они есть
                price: pricingDoc?.price || dbDoc.price,
                price_rub: pricingDoc?.price || dbDoc.price_rub,
                // Добавляем дополнительные поля из конфигурации
                ...(pricingDoc && {
                    originalPrice: pricingDoc.originalPrice,
                    category: pricingDoc.category
                })
            }
        })

        return NextResponse.json({ data: documentsWithPricing })
    } catch (error) {
        console.error('Documents API error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
