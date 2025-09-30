import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyTelegram } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🏥 Starting health check...')
    
    const healthStatus = await performHealthCheck()
    
    if (!healthStatus.healthy) {
      // Отправляем уведомление о проблемах
      await notifyTelegram(
        `🚨 Проблемы с сайтом!\n\n` +
        `❌ Проблемы:\n${healthStatus.issues.join('\n')}\n\n` +
        `⏰ Время: ${new Date().toLocaleString('ru-RU')}\n` +
        `🌐 Сайт: https://energylogic-ai.com`,
        {
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          chatId: process.env.TELEGRAM_CHAT_ID,
          disableWebPagePreview: true
        }
      )
    }

    return NextResponse.json({
      success: true,
      healthy: healthStatus.healthy,
      issues: healthStatus.issues,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Health check error:', error)
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}

async function performHealthCheck() {
  const issues: string[] = []
  
  try {
    // Проверяем подключение к Supabase
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (error) {
      issues.push(`❌ Supabase: ${error.message}`)
    } else {
      console.log('✅ Supabase connection: OK')
    }
  } catch (error) {
    issues.push(`❌ Supabase: Connection failed`)
  }

  try {
    // Проверяем доступность сайта
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch('https://energylogic-ai.com', {
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      issues.push(`❌ Website: HTTP ${response.status}`)
    } else {
      console.log('✅ Website: OK')
    }
  } catch (error) {
    issues.push(`❌ Website: Unreachable`)
  }

  try {
    // Проверяем API endpoints
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const apiResponse = await fetch('https://energylogic-ai.com/api/auth/me', {
      method: 'GET',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (apiResponse.status !== 401) { // 401 ожидается для неавторизованных
      issues.push(`❌ API: Unexpected status ${apiResponse.status}`)
    } else {
      console.log('✅ API: OK')
    }
  } catch (error) {
    issues.push(`❌ API: Unreachable`)
  }

  // Проверяем использование диска (если доступно)
  try {
    const diskUsage = await checkDiskUsage()
    if (diskUsage > 90) {
      issues.push(`⚠️ Disk usage: ${diskUsage}%`)
    }
  } catch (error) {
    // Игнорируем ошибки проверки диска
  }

  return {
    healthy: issues.length === 0,
    issues
  }
}

async function checkDiskUsage(): Promise<number> {
  // Простая проверка использования диска
  // В реальном приложении здесь может быть более сложная логика
  return Math.random() * 100 // Заглушка
}
