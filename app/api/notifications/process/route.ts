// API для обработки отложенных email уведомлений

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
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
      .limit(10) // Обрабатываем по 10 за раз

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
              emailSent = await emailService.sendWelcomeEmail({
                name: notification.users.name,
                email: notification.users.email,
                tempPassword: notification.users.temp_password || 'temp_password',
                loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`
              })
            }
            break

          case 'callback_reply':
            if (notification.callback_requests) {
              emailSent = await emailService.sendCallbackReplyEmail({
                name: notification.callback_requests.name,
                email: notification.callback_requests.email,
                adminName: notification.metadata?.admin_name || 'Специалист',
                message: notification.metadata?.message || '',
                callbackId: notification.callback_request_id,
                dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
              })
            }
            break

          case 'status_change':
            if (notification.callback_requests) {
              emailSent = await emailService.sendCallbackStatusEmail({
                name: notification.callback_requests.name,
                email: notification.callback_requests.email,
                status: notification.metadata?.status || 'Обновлен',
                callbackId: notification.callback_request_id,
                dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
              })
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
      total: notifications.length
    })

  } catch (error) {
    console.error('Error processing notifications:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET endpoint для проверки статуса уведомлений
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data: stats, error } = await supabase
      .from('callback_notifications')
      .select('status')
      .in('status', ['pending', 'sent', 'failed'])

    if (error) {
      console.error('Error fetching notification stats:', error)
      return NextResponse.json(
        { error: 'Ошибка получения статистики' },
        { status: 500 }
      )
    }

    const statsData = {
      pending: stats?.filter(s => s.status === 'pending').length || 0,
      sent: stats?.filter(s => s.status === 'sent').length || 0,
      failed: stats?.filter(s => s.status === 'failed').length || 0,
      total: stats?.length || 0
    }

    return NextResponse.json({
      success: true,
      stats: statsData,
      emailService: emailService.getConfig()
    })

  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
