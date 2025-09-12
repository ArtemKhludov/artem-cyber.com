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

        // Получаем информацию о рабочих тетрадях для каждого документа
        const documentIds = dbDocuments?.map(doc => doc.id) || []
        let workbooksData: Record<string, any[]> = {}

        if (documentIds.length > 0) {
            const { data: workbooks, error: workbooksError } = await supabase
                .from('course_workbooks')
                .select('*')
                .in('document_id', documentIds)
                .eq('is_active', true)
                .order('order_index', { ascending: true })

            if (!workbooksError && workbooks) {
                workbooksData = workbooks.reduce((acc, workbook) => {
                    if (!acc[workbook.document_id]) {
                        acc[workbook.document_id] = []
                    }
                    acc[workbook.document_id].push({
                        id: workbook.id,
                        title: workbook.title,
                        description: workbook.description,
                        video_url: workbook.video_url,
                        order_index: workbook.order_index
                    })
                    return acc
                }, {})
            }
        }

        // Объединяем данные из базы с конфигурацией цен
        const documentsWithPricing = (dbDocuments || []).map(dbDoc => {
            // Ищем соответствующий документ в конфигурации цен
            const pricingDoc = PDF_DOCUMENTS.find(pdf =>
                pdf.title === dbDoc.title ||
                pdf.id === dbDoc.id
            )

            const workbooks = workbooksData[dbDoc.id] || []

            return {
                ...dbDoc,
                // Используем цены из конфигурации, если они есть
                price: pricingDoc?.price || dbDoc.price,
                price_rub: pricingDoc?.price || dbDoc.price_rub,
                // Добавляем информацию о рабочих тетрадях
                workbook_count: workbooks.length,
                has_workbook: workbooks.length > 0,
                workbooks: workbooks,
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
