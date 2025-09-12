import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const {
            title,
            description,
            course_description,
            main_pdf_title,
            main_pdf_description,
            price_rub,
            file_url,
            cover_url,
            page_count,
            course_type,
            video_preview_url,
            course_duration_minutes,
            video_count,
            has_workbook,
            has_audio,
            has_videos
        } = body

        if (!id) {
            return NextResponse.json({ error: 'ID документа обязателен' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        const updateData: any = {}
        if (title) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (course_description !== undefined) updateData.course_description = course_description
        if (main_pdf_title !== undefined) updateData.main_pdf_title = main_pdf_title
        if (main_pdf_description !== undefined) updateData.main_pdf_description = main_pdf_description
        if (price_rub) {
            updateData.price_rub = parseInt(price_rub)
            updateData.price = parseInt(price_rub) // дублирование для совместимости
        }
        if (file_url) updateData.file_url = file_url
        if (cover_url !== undefined) updateData.cover_url = cover_url
        if (page_count) updateData.page_count = parseInt(page_count)
        if (course_type !== undefined) updateData.course_type = course_type
        if (video_preview_url !== undefined) updateData.video_preview_url = video_preview_url
        if (course_duration_minutes !== undefined) updateData.course_duration_minutes = course_duration_minutes ? parseInt(course_duration_minutes) : null
        if (video_count !== undefined) updateData.video_count = video_count ? parseInt(video_count) : null
        if (has_workbook !== undefined) updateData.has_workbook = has_workbook
        if (has_audio !== undefined) updateData.has_audio = has_audio
        if (has_videos !== undefined) updateData.has_videos = has_videos

        const { data: document, error } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating document:', error)
            return NextResponse.json({ error: 'Ошибка обновления документа' }, { status: 500 })
        }

        if (!document) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Отправка уведомления в Telegram
        try {
            const telegramMessage = `📝 Документ обновлен:
📋 Название: ${document.title}
💰 Цена: ${document.price_rub} ₽
📊 Страниц: ${document.page_count}
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

        return NextResponse.json({ document })
    } catch (error) {
        console.error('Update document API error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        if (!id) {
            return NextResponse.json({ error: 'ID документа обязателен' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Сначала получаем информацию о документе для уведомления
        const { data: document, error: fetchError } = await supabase
            .from('documents')
            .select('title, price_rub')
            .eq('id', id)
            .single()

        if (fetchError) {
            console.error('Error fetching document for deletion:', fetchError)
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Удаляем документ
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting document:', error)
            return NextResponse.json({ error: 'Ошибка удаления документа' }, { status: 500 })
        }

        // Отправка уведомления в Telegram
        try {
            const telegramMessage = `🗑️ Документ удален из системы:
📋 Название: ${document.title}
💰 Цена была: ${document.price_rub} ₽
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

        return NextResponse.json({ message: 'Документ успешно удален' })
    } catch (error) {
        console.error('Delete document API error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
