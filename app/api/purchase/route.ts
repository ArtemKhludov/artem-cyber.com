import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, product_type, product_name, product_id, amount, currency = 'RUB', status = 'completed', payment_method = 'manual' } = body

    // Валидация обязательных полей
    if (!name || !phone || !product_type || !product_name || !amount) {
      return NextResponse.json(
        { error: 'Имя, телефон, тип товара, название товара и сумма обязательны' },
        { status: 400 }
      )
    }



    // Сохранение покупки в базу данных
    const { data, error } = await supabase
      .from('purchase_requests')
      .insert([
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          product_type: product_type,
          product_name: product_name,
          product_id: product_id || null,
          amount: amount,
          currency: currency,
          status: status,
          payment_method: payment_method
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Ошибка сохранения покупки', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Покупка успешно добавлена',
      data
    })

  } catch (error) {
    console.error('Purchase creation error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
