import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get('session_token')?.value

        if (!sessionToken) {
            return { error: 'Не авторизован' }
        }

        const supabase = getSupabaseAdmin()
        const { data: session, error } = await supabase
            .from('user_sessions')
            .select(`
                user_id,
                users (
                    id,
                    role
                )
            `)
            .eq('session_token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single()

        const users = session?.users as any
        const userRole = Array.isArray(users) ? users[0]?.role : users?.role
        if (error || !session || userRole !== 'admin') {
            return { error: 'Недостаточно прав' }
        }

        return { success: true }
    } catch (error) {
        return { error: 'Ошибка проверки авторизации' }
    }
}

export async function GET(request: NextRequest) {
    try {
        const authCheck = await checkAdminAuth()
        if (authCheck.error) {
            return NextResponse.json({ error: authCheck.error }, { status: 401 })
        }

        const supabase = getSupabaseAdmin()

        const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching documents:', error)
            return NextResponse.json({ error: 'Ошибка получения документов' }, { status: 500 })
        }

        return NextResponse.json({ documents })
    } catch (error) {
        console.error('Documents API error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const authCheck = await checkAdminAuth()
        if (authCheck.error) {
            return NextResponse.json({ error: authCheck.error }, { status: 401 })
        }

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

        if (!title || !price_rub || !file_url) {
            return NextResponse.json({ error: 'Необходимы поля: title, price_rub, file_url' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        const { data: document, error } = await supabase
            .from('documents')
            .insert({
                title,
                description: description || '',
                course_description: course_description || '',
                main_pdf_title: main_pdf_title || '',
                main_pdf_description: main_pdf_description || '',
                price_rub: parseInt(price_rub),
                price: parseInt(price_rub), // дублирование для совместимости
                file_url,
                cover_url: cover_url || '',
                course_type: course_type || 'mini_course',
                video_preview_url: video_preview_url || '',
                course_duration_minutes: course_duration_minutes ? parseInt(course_duration_minutes) : null,
                video_count: video_count ? parseInt(video_count) : null,
                has_workbook: has_workbook || false,
                has_audio: has_audio || false,
                has_videos: has_videos || false
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating document:', error)
            return NextResponse.json({ error: 'Ошибка создания документа' }, { status: 500 })
        }

        // Отправка уведомления в Telegram
        try {
            const telegramMessage = `📄 Новый документ добавлен в систему:
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
        console.error('Create document API error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
