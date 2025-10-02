// Cron job для обработки отложенных email уведомлений

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email-service'
import { emailTemplates } from '@/lib/email-templates'

export async function GET(request: NextRequest) {
  try {
    // Проверяем, что это cron job (можно добавить проверку API ключа)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Получаем все pending уведомления
    const { data: notifications, error } = await supabase
      .from('callback_notifications')
      .select(`
        *,
        callback_requests!inner(
          id,
          name,
          email,
          phone,
          message,
          product_name,
          product_type
        ),
        users!inner(
          id,
          name,
          email,
          temp_password
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20) // Обрабатываем по 20 за раз

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Ошибка получения уведомлений' },
        { status: 500 }
      )
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Нет pending уведомлений',
        processed: 0
      })
    }

    let processed = 0
    let errors = 0

    for (const notification of notifications) {
      try {
        let emailSent = false

        switch (notification.notification_type) {
          case 'welcome_email':
            if (notification.users && notification.callback_requests) {
              const emailContent = emailTemplates.getWelcomeEmailTemplate({
                name: notification.users.name,
                email: notification.users.email,
                tempPassword: notification.users.temp_password,
                loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/auth/login`
              })
              const result = await sendEmail({
                to: notification.users.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
              })
              emailSent = result
            }
            break

          case 'new_reply':
            if (notification.callback_requests) {
               const emailContent = emailTemplates.getCallbackReplyEmailTemplate({
                 name: notification.callback_requests.name,
                 email: notification.callback_requests.email,
                 adminName: 'Администратор',
                 message: notification.metadata?.reply_message || '',
                 callbackId: notification.callback_request_id,
                 dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/dashboard`
               })
              const result = await sendEmail({
                to: notification.callback_requests.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
              })
              emailSent = result
            }
            break

          default:
            console.log(`Unknown notification type: ${notification.notification_type}`)
        }

        // Обновляем статус уведомления
        const updateData: any = {
          status: emailSent ? 'sent' : 'failed',
          sent_at: new Date().toISOString()
        }

        if (!emailSent) {
          updateData.error_message = 'Failed to send email'
        }

        await supabase
          .from('callback_notifications')
          .update(updateData)
          .eq('id', notification.id)

        if (emailSent) {
          processed++
        } else {
          errors++
        }

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)
        
        // Помечаем как failed
        await supabase
          .from('callback_notifications')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Обработано ${processed} уведомлений, ошибок: ${errors}`,
      processed,
      errors,
      total: notifications.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error processing notifications:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
