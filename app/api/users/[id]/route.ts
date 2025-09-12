import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: userId } = await context.params

        if (!userId) {
            return NextResponse.json(
                { error: 'ID пользователя обязателен' },
                { status: 400 }
            )
        }

        // Получаем основную информацию о CRM пользователе
        const { data: user, error: userError } = await supabase
            .from('crm_users')
            .select('*')
            .eq('id', userId)
            .single()

        if (userError) {
            console.error('User error:', userError)
            return NextResponse.json(
                { error: 'Пользователь не найден' },
                { status: 404 }
            )
        }

        // Получаем все заявки пользователя
        const { data: requests, error: requestsError } = await supabase
            .from('callback_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (requestsError) {
            console.error('Requests error:', requestsError)
        }

        // Получаем все покупки пользователя
        const { data: purchases, error: purchasesError } = await supabase
            .from('purchase_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (purchasesError) {
            console.error('Purchases error:', purchasesError)
        }

        // Формируем ответ
        const userData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                created_at: user.created_at,
                last_activity: user.last_activity,
                total_requests: user.total_requests,
                total_purchases: user.total_purchases,
                total_spent: user.total_spent,
                notes: user.notes
            },
            requests: (requests || []).map(request => ({
                id: request.id,
                created_at: request.created_at,
                product_type: request.product_type,
                product_name: request.product_name,
                status: request.status,
                source_page: request.source_page,
                message: request.message
            })),
            purchases: (purchases || []).map(purchase => ({
                id: purchase.id,
                created_at: purchase.created_at,
                product_name: purchase.product_name,
                amount: purchase.amount,
                status: purchase.status,
                payment_method: purchase.payment_method || 'Не указан'
            }))
        }

        return NextResponse.json({
            success: true,
            data: userData
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: userId } = await context.params
        const body = await request.json()
        const { name, email, notes } = body

        if (!userId) {
            return NextResponse.json(
                { error: 'ID пользователя обязателен' },
                { status: 400 }
            )
        }

        // Обновляем информацию о CRM пользователе
        const { data, error } = await supabase
            .from('crm_users')
            .update({
                name: name?.trim(),
                email: email?.trim() || null,
                notes: notes?.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Ошибка обновления пользователя' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Пользователь успешно обновлен',
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

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: userId } = await context.params

        if (!userId) {
            return NextResponse.json(
                { error: 'ID пользователя обязателен' },
                { status: 400 }
            )
        }

        // Удаляем CRM пользователя
        const { error } = await supabase
            .from('crm_users')
            .delete()
            .eq('id', userId)

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Ошибка удаления пользователя' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Пользователь успешно удален'
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}