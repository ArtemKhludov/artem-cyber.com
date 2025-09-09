import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Простой API пользователей без сложной логики
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''

        console.log('🔍 API запрос:', { page, limit, search })

        // Используем работающую функцию search_users
        const { data: users, error } = await supabase
            .rpc('search_users', {
                search_term: search || null,
                limit_count: limit,
                offset_count: (page - 1) * limit
            })

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Ошибка получения данных пользователей' },
                { status: 500 }
            )
        }

        console.log('📊 Получено пользователей:', users?.length || 0)

        // Функция search_users уже возвращает данные с activity_status
        const usersWithStatus = users || []

        console.log('📄 Возвращаем пользователей:', usersWithStatus.length)

        return NextResponse.json({
            success: true,
            data: usersWithStatus,
            count: usersWithStatus.length,
            page,
            limit,
            totalPages: Math.ceil(usersWithStatus.length / limit)
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}