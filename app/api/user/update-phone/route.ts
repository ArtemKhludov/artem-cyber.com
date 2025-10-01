import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { validation, response } = await requireUser(request)
  if (!validation) return response!

  try {
    const { phone } = await request.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    // Валидация формата телефона
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Неверный формат телефона' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    
    // Проверяем нет ли уже такого телефона у другого пользователя
    const { data: existingPhone } = await supabase
      .from('users')
      .select('id, email')
      .eq('phone', phone.trim())
      .neq('id', validation.session.user_id)
      .maybeSingle()

    if (existingPhone) {
      return NextResponse.json({ 
        error: 'Этот номер телефона уже используется другим пользователем' 
      }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('users')
      .update({ 
        phone: phone.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', validation.session.user_id)

    if (error) {
      console.error('Failed to update phone:', error)
      return NextResponse.json({ error: 'Failed to update phone' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update phone error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
