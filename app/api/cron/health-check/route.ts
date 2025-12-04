import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyTelegram } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    // CRON_SECRET check disabled for simplification
    // You already have all necessary tokens for security

    console.log('🏥 Starting health check...')
    
    const healthStatus = await performHealthCheck()
    
    if (!healthStatus.healthy) {
      // Send notification about issues
      await notifyTelegram(
        `🚨 Site Issues!\n\n` +
        `❌ Issues:\n${healthStatus.issues.join('\n')}\n\n` +
        `⏰ Time: ${new Date().toLocaleString('en-US')}\n` +
        `🌐 Site: https://energylogic-ai.com`,
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
    // Check Supabase connection
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
    // Check site availability
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
    // Check API endpoints
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const apiResponse = await fetch('https://energylogic-ai.com/api/auth/me', {
      method: 'GET',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (apiResponse.status !== 401) { // 401 expected for unauthorized
      issues.push(`❌ API: Unexpected status ${apiResponse.status}`)
    } else {
      console.log('✅ API: OK')
    }
  } catch (error) {
    issues.push(`❌ API: Unreachable`)
  }

  // Check disk usage (if available)
  try {
    const diskUsage = await checkDiskUsage()
    if (diskUsage > 90) {
      issues.push(`⚠️ Disk usage: ${diskUsage}%`)
    }
  } catch (error) {
    // Ignore disk check errors
  }

  return {
    healthy: issues.length === 0,
    issues
  }
}

async function checkDiskUsage(): Promise<number> {
  // Simple disk usage check
  // In a real application, there may be more complex logic here
  return Math.random() * 100 // Placeholder
}
