import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const { name, email, phone, country, orderData } = await request.json()

        if (!name || !email || !phone || !country) {
            return NextResponse.json({
                success: false,
                error: 'Все поля обязательны'
            }, { status: 400 })
        }

        console.log('💾 Сохраняем данные покупателя:', email)

        // Проверяем, существует ли пользователь с таким email
        const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single()

        let userId: string

        if (userCheckError && userCheckError.code === 'PGRST116') {
            // Пользователь не существует, создаем нового
            const { data: newUser, error: createUserError } = await supabase
                .from('users')
                .insert({
                    email: email.toLowerCase(),
                    name: name.trim(),
                    phone: phone.trim(),
                    role: 'user',
                    is_active: true,
                    email_verified: false
                })
                .select('id')
                .single()

            if (createUserError) {
                console.error('❌ Ошибка создания пользователя:', createUserError)
                return NextResponse.json({
                    success: false,
                    error: 'Ошибка создания пользователя',
                    details: createUserError.message
                }, { status: 500 })
            }

            userId = newUser.id
            console.log('✅ Создан новый пользователь:', email)
        } else if (userCheckError) {
            console.error('❌ Ошибка проверки пользователя:', userCheckError)
            return NextResponse.json({
                success: false,
                error: 'Ошибка проверки пользователя'
            }, { status: 500 })
        } else {
            // Пользователь существует, обновляем данные
            userId = existingUser.id

            const { error: updateUserError } = await supabase
                .from('users')
                .update({
                    name: name.trim(),
                    phone: phone.trim()
                })
                .eq('id', userId)

            if (updateUserError) {
                console.error('❌ Ошибка обновления пользователя:', updateUserError)
                return NextResponse.json({
                    success: false,
                    error: 'Ошибка обновления пользователя'
                }, { status: 500 })
            }

            console.log('✅ Обновлены данные пользователя:', email)
        }

        // Сохраняем данные заказа в purchase_requests
        if (orderData) {
            const { error: purchaseError } = await supabase
                .from('purchase_requests')
                .insert({
                    name: name.trim(),
                    email: email.toLowerCase(),
                    phone: phone.trim(),
                    product_type: orderData.productType || 'pdf',
                    product_name: orderData.productName || 'PDF документ',
                    product_id: orderData.productId || null,
                    amount: orderData.amount || 0,
                    currency: orderData.currency || 'RUB',
                    status: 'new',
                    payment_method: orderData.paymentMethod || 'stripe',
                    priority: 'medium',
                    source: 'website',
                    notes: `Страна: ${country}`
                })

            if (purchaseError) {
                console.error('❌ Ошибка сохранения заказа:', purchaseError)
                return NextResponse.json({
                    success: false,
                    error: 'Ошибка сохранения заказа',
                    details: purchaseError.message
                }, { status: 500 })
            }

            console.log('✅ Сохранен заказ для пользователя:', email)
        }

        return NextResponse.json({
            success: true,
            message: 'Данные покупателя сохранены успешно',
            userId: userId
        })

    } catch (error) {
        console.error('❌ Ошибка сохранения данных покупателя:', error)
        return NextResponse.json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        }, { status: 500 })
    }
}
