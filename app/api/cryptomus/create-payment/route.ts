import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

const CRYPTOMUS_API_KEY = process.env.CRYPTOMUS_API_KEY!
const CRYPTOMUS_MERCHANT_ID = process.env.CRYPTOMUS_MERCHANT_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Функция для создания подписи Cryptomus
function createCryptomusSignature(data: any): string {
  const jsonString = JSON.stringify(data)
  const encoded = Buffer.from(jsonString).toString('base64')
  return crypto.createHash('md5').update(encoded + CRYPTOMUS_API_KEY).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем наличие переменных окружения
    if (!CRYPTOMUS_API_KEY || !CRYPTOMUS_MERCHANT_ID) {
      console.error('Missing Cryptomus environment variables')
      return NextResponse.json(
        { error: 'Cryptomus service not configured' },
        { status: 500 }
      )
    }

    const {
      documentId,
      amount,
      currency = 'RUB',
      userEmail,
      userCountry,
      userIP,
    } = await request.json()

    if (!documentId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, amount' },
        { status: 400 }
      )
    }

    // Получаем документ из базы данных
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Создаем уникальный ID заказа
    const orderId = `${documentId}-${Date.now()}`

    // Подготавливаем данные для Cryptomus API
    const paymentData = {
      amount: amount.toString(),
      currency,
      order_id: orderId,
      url_return: `${APP_URL}/checkout/success?order_id=${orderId}`,
      url_callback: `${APP_URL}/api/cryptomus/callback`,
      is_payment_multiple: false,
      lifetime: 300, // 5 минут на оплату
      to_currency: currency, // Валюта получения
    }

    // Создаем подпись
    const sign = createCryptomusSignature(paymentData)

    // Отправляем запрос к Cryptomus API
    const response = await fetch('https://api.cryptomus.com/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': CRYPTOMUS_MERCHANT_ID,
        'sign': sign,
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cryptomus API error:', response.status, errorText)
      throw new Error('Failed to create payment with Cryptomus')
    }

    const responseData = await response.json()

    if (responseData.state !== 0) {
      console.error('Cryptomus API returned error:', responseData)
      throw new Error(responseData.message || 'Cryptomus API error')
    }

    // Создаем запись о покупке в статусе pending
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        document_id: documentId,
        payment_method: 'cryptomus',
        payment_status: 'pending',
        cryptomus_order_id: orderId,
        amount_paid: amount,
        currency: currency.toUpperCase(),
        user_email: userEmail,
        user_country: userCountry,
        user_ip: userIP,
      })

    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError)
      // Продолжаем выполнение, так как платеж в Cryptomus уже создан
    }

    return NextResponse.json({
      paymentUrl: responseData.result.url,
      orderId,
      amount: responseData.result.amount,
      currency: responseData.result.currency,
    })
  } catch (error) {
    console.error('Cryptomus payment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
