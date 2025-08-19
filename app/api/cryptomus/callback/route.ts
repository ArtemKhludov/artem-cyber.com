import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY!

// Функция для проверки подписи от Cryptomus
function verifyCryptomusSignature(data: any, signature: string): boolean {
  const jsonString = JSON.stringify(data)
  const encoded = Buffer.from(jsonString).toString('base64')
  const expectedSignature = crypto.createHash('md5').update(encoded + CRYPTOMUS_API_KEY).digest('hex')
  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('sign')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Проверяем подпись
    if (!verifyCryptomusSignature(body, signature)) {
      console.error('Invalid Cryptomus signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const { order_id, status, amount, currency } = body

    console.log('Cryptomus callback received:', { order_id, status, amount, currency })

    // Определяем статус платежа
    let paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
    
    switch (status) {
      case 'paid':
      case 'paid_over':
        paymentStatus = 'completed'
        break
      case 'failed':
      case 'wrong_amount':
      case 'cancel':
        paymentStatus = 'failed'
        break
      case 'refund':
      case 'refund_paid':
        paymentStatus = 'refunded'
        break
      default:
        paymentStatus = 'pending'
    }

    // Обновляем статус покупки в базе данных
    const { error } = await supabase
      .from('purchases')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('cryptomus_order_id', order_id)

    if (error) {
      console.error('Error updating purchase status:', error)
      return NextResponse.json(
        { error: 'Failed to update purchase status' },
        { status: 500 }
      )
    }

    console.log(`Payment ${order_id} status updated to: ${paymentStatus}`)

    // Возвращаем успешный ответ
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Cryptomus callback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
