import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // SQL для создания таблицы purchase_requests
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.purchase_requests (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        product_type TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'RUB',
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL })

    if (error) {
      console.error('Error creating table:', error)
      return NextResponse.json(
        { error: 'Ошибка создания таблицы' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Таблица purchase_requests создана успешно'
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
