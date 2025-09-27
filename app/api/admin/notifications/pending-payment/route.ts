import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/session'
import { sendEmail } from '@/lib/notify'

async function requireAdmin(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        let sessionToken = authHeader?.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : undefined
        if (!sessionToken) {
            sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
        }

        const validation = await validateSessionToken(sessionToken, { touch: false })
        if (!validation.user || validation.user.role !== 'admin') {
            return { success: false, error: 'Forbidden', status: 403 }
        }

        return {
            success: true,
            userId: validation.session?.user_id || validation.user.id,
            userEmail: validation.user.email
        }
    } catch (error) {
        return { success: false, error: 'Unauthorized', status: 401 }
    }
}

export async function POST(request: NextRequest) {
    try {
        // Проверяем права администратора
        const adminResult = await requireAdmin(request)
        if (!adminResult.success) {
            return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
        }

        const { userId, purchaseId, customMessage } = await request.json()

        if (!userId && !purchaseId) {
            return NextResponse.json({ error: 'userId или purchaseId обязательны' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Получаем информацию о покупке
        let purchase
        if (purchaseId) {
            const { data: purchaseData, error: purchaseError } = await supabase
                .from('purchases')
                .select(`
          id,
          user_id,
          user_email,
          product_name,
          amount_paid,
          currency,
          status,
          grace_period_until,
          user_course_access!inner(
            id,
            document_id,
            is_grace_period
          )
        `)
                .eq('id', purchaseId)
                .single()

            if (purchaseError || !purchaseData) {
                return NextResponse.json({ error: 'Покупка не найдена' }, { status: 404 })
            }

            purchase = purchaseData
        } else {
            // Получаем последнюю grace period покупку пользователя
            const { data: purchaseData, error: purchaseError } = await supabase
                .from('purchases')
                .select(`
          id,
          user_id,
          user_email,
          product_name,
          amount_paid,
          currency,
          status,
          grace_period_until,
          user_course_access!inner(
            id,
            document_id,
            is_grace_period
          )
        `)
                .eq('user_id', userId)
                .eq('grace_period_verified', false)
                .not('grace_period_until', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (purchaseError || !purchaseData) {
                return NextResponse.json({ error: 'Grace period покупка не найдена' }, { status: 404 })
            }

            purchase = purchaseData
        }

        // Получаем информацию о пользователе
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name, phone')
            .eq('id', purchase.user_id)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
        }

        // Вычисляем оставшееся время grace period
        const gracePeriodEnd = new Date(purchase.grace_period_until)
        const now = new Date()
        const timeRemaining = Math.max(0, gracePeriodEnd.getTime() - now.getTime())
        const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60))

        // Формируем сообщение
        const defaultMessage = customMessage || `
Ваш доступ к курсу "${purchase.product_name}" находится в процессе проверки оплаты.

⏰ Время проверки: ${minutesRemaining} минут
💳 Сумма: ${purchase.amount_paid} ${purchase.currency}
📧 Email для связи: ${user.email}

Мы проверяем ваш платеж и в ближайшее время подтвердим доступ.
Если у вас есть вопросы, обратитесь в поддержку.
    `.trim()

        // Отправляем email
        const emailResult = await sendEmail({
            to: user.email,
            subject: `Проверка оплаты: ${purchase.product_name}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Проверка оплаты</h2>
          <p>Здравствуйте, ${user.name || 'пользователь'}!</p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">Ваш доступ проверяется</h3>
            <p style="color: #856404; white-space: pre-wrap;">${defaultMessage}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Детали заказа:</h4>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Курс:</strong> ${purchase.product_name}</li>
              <li><strong>Сумма:</strong> ${purchase.amount_paid} ${purchase.currency}</li>
              <li><strong>Время проверки:</strong> ${minutesRemaining} минут</li>
            </ul>
          </div>
          
          <p>Если у вас есть вопросы по поводу оплаты, пожалуйста, обратитесь в нашу службу поддержки.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Это автоматическое сообщение. Пожалуйста, не отвечайте на него напрямую.
          </p>
        </div>
      `,
            text: `
Проверка оплаты

Здравствуйте, ${user.name || 'пользователь'}!

Ваш доступ проверяется

${defaultMessage}

Детали заказа:
- Курс: ${purchase.product_name}
- Сумма: ${purchase.amount_paid} ${purchase.currency}
- Время проверки: ${minutesRemaining} минут

Если у вас есть вопросы по поводу оплаты, пожалуйста, обратитесь в нашу службу поддержки.

---
Это автоматическое сообщение.
      `
        })

        // Логируем отправку уведомления
        await supabase.from('audit_logs').insert({
            user_id: adminResult.userId,
            action: 'send_pending_payment_notification',
            target_type: 'user',
            target_id: user.id,
            metadata: {
                purchase_id: purchase.id,
                user_email: user.email,
                product_name: purchase.product_name,
                minutes_remaining: minutesRemaining,
                email_sent: emailResult.ok,
                custom_message: !!customMessage
            }
        })

        return NextResponse.json({
            success: true,
            message: `Уведомление отправлено пользователю ${user.email}`,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                },
                purchase: {
                    id: purchase.id,
                    product_name: purchase.product_name,
                    amount_paid: purchase.amount_paid,
                    currency: purchase.currency
                },
                gracePeriod: {
                    until: purchase.grace_period_until,
                    minutesRemaining
                },
                emailSent: emailResult.ok
            }
        })

    } catch (error) {
        console.error('Send pending payment notification error:', error)
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
    }
}
