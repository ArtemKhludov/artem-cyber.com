import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const path = searchParams.get('path')
        const bucket = searchParams.get('bucket') || 'course-materials'

        if (!path) {
            return NextResponse.json(
                { error: 'Путь к файлу обязателен' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Получаем публичный URL файла
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)

        return NextResponse.json({
            success: true,
            url: data.publicUrl,
            path: path
        })

    } catch (error) {
        console.error('Storage URL API error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
