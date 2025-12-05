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
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
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
            updateData.price = parseInt(price_rub) // duplicate for compatibility
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
            return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
        }

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Send Telegram notification
        try {
            const telegramMessage = `📝 Document updated:
📋 Title: ${document.title}
💰 Price: $${document.price_rub}
📊 Pages: ${document.page_count}
📅 Date: ${new Date().toLocaleString('en-US')}`

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
                console.log('✅ Telegram notification sent')
            }
        } catch (telegramError) {
            console.error('Telegram error:', telegramError)
        }

        return NextResponse.json({ document })
    } catch (error) {
        console.error('Update document API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        if (!id) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // First get document information for notification
        const { data: document, error: fetchError } = await supabase
            .from('documents')
            .select('title, price_rub')
            .eq('id', id)
            .single()

        if (fetchError) {
            console.error('Error fetching document for deletion:', fetchError)
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Delete document
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting document:', error)
            return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
        }

        // Send Telegram notification
        try {
            const telegramMessage = `🗑️ Document deleted from system:
📋 Title: ${document.title}
💰 Price was: $${document.price_rub}
📅 Date: ${new Date().toLocaleString('en-US')}`

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
                console.log('✅ Telegram notification sent')
            }
        } catch (telegramError) {
            console.error('Telegram error:', telegramError)
        }

        return NextResponse.json({ message: 'Document deleted successfully' })
    } catch (error) {
        console.error('Delete document API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
