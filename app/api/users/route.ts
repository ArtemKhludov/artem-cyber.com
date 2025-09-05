import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''
        const sortBy = searchParams.get('sortBy') || 'created_at'
        const sortOrder = searchParams.get('sortOrder') || 'desc'

        let query = supabase
            .from('crm_users')
            .select('*', { count: 'exact' })

        // Поиск по имени, телефону или email
        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
        }

        // Сортировка
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })

        // Пагинация
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Ошибка получения данных пользователей' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            count: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, phone, email, notes, source = 'manual' } = body

        // Валидация обязательных полей
        if (!name || !phone) {
            return NextResponse.json(
                { error: 'Имя и телефон обязательны' },
                { status: 400 }
            )
        }

        // Проверяем, существует ли CRM пользователь с таким телефоном
        const { data: existingUser } = await supabase
            .from('crm_users')
            .select('id')
            .eq('phone', phone)
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'Пользователь с таким телефоном уже существует' },
                { status: 400 }
            )
        }

        // Создаем нового CRM пользователя
        const { data, error } = await supabase
            .from('crm_users')
            .insert([{
                name: name.trim(),
                phone: phone.trim(),
                email: email?.trim() || null,
                notes: notes?.trim() || null,
                source: source
            }])
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Ошибка создания пользователя' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Пользователь успешно создан',
            data: data
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}