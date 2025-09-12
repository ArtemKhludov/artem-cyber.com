import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/users/[id]/activity - Получить историю активности пользователя
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = getSupabaseAdmin()
        const { id: userId } = await context.params
        const { searchParams } = new URL(request.url)

        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const type = searchParams.get('type') || '' // request, purchase, all
        const startDate = searchParams.get('startDate') || ''
        const endDate = searchParams.get('endDate') || ''

        const offset = (page - 1) * limit

        // Базовый запрос для активности
        let query = supabase
            .from('user_activity')
            .select('*')
            .eq('user_id', userId)

        // Фильтр по типу активности
        if (type && type !== 'all') {
            query = query.eq('activity_type', type)
        }

        // Фильтр по датам
        if (startDate) {
            query = query.gte('created_at', startDate)
        }
        if (endDate) {
            query = query.lte('created_at', endDate)
        }

        // Сортировка и пагинация
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        const { data: activity, error, count } = await query

        if (error) {
            console.error('Error fetching user activity:', error)
            return NextResponse.json({ error: 'Ошибка получения активности пользователя' }, { status: 500 })
        }

        // Получаем общее количество записей для пагинации
        let countQuery = supabase
            .from('user_activity')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        if (type && type !== 'all') {
            countQuery = countQuery.eq('activity_type', type)
        }
        if (startDate) {
            countQuery = countQuery.gte('created_at', startDate)
        }
        if (endDate) {
            countQuery = countQuery.lte('created_at', endDate)
        }

        const { count: totalCount } = await countQuery

        // Группируем активность по дням для удобства отображения
        const groupedActivity = activity?.reduce((acc, item) => {
            const date = new Date(item.created_at).toISOString().split('T')[0]
            if (!acc[date]) {
                acc[date] = []
            }
            acc[date].push(item)
            return acc
        }, {} as Record<string, any[]>) || {}

        return NextResponse.json({
            activity,
            groupedActivity,
            pagination: {
                page,
                limit,
                total: totalCount || 0,
                pages: Math.ceil((totalCount || 0) / limit)
            }
        })

    } catch (error) {
        console.error('Error in GET /api/users/[id]/activity:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
