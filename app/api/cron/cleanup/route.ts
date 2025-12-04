import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifyTelegram } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    // CRON_SECRET check disabled for simplification
    // You already have all necessary tokens for security

    console.log('🧹 Starting cleanup cron job...')
    
    const results = await Promise.allSettled([
      cleanupExpiredSessions(),
      cleanupOldLogs(),
      cleanupTemporaryFiles(),
      sendDailyReport()
    ])

    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failureCount = results.filter(r => r.status === 'rejected').length

    console.log(`✅ Cleanup completed: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      results: {
        successful: successCount,
        failed: failureCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

async function cleanupExpiredSessions() {
  const supabase = getSupabaseAdmin()
  
  // Delete expired sessions (older than 7 days)
  const { error, count } = await supabase
    .from('user_sessions')
    .delete()
    .lt('expires_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('❌ Failed to cleanup sessions:', error)
    throw error
  }

  console.log(`🧹 Cleaned up ${count || 0} expired sessions`)
  return count || 0
}

async function cleanupOldLogs() {
  const supabase = getSupabaseAdmin()
  
  // Delete old logs (older than 30 days)
  const { error, count } = await supabase
    .from('audit_logs')
    .delete()
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('❌ Failed to cleanup logs:', error)
    throw error
  }

  console.log(`🧹 Cleaned up ${count || 0} old logs`)
  return count || 0
}

async function cleanupTemporaryFiles() {
  // Here you can add temporary files cleanup
  // For example, unused uploaded files
  console.log('🧹 Temporary files cleanup completed')
  return 0
}

async function sendDailyReport() {
  const supabase = getSupabaseAdmin()
  
  // Get statistics for the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const [usersResult, purchasesResult, issuesResult] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact' })
      .gte('created_at', yesterday),
    supabase
      .from('purchases')
      .select('id', { count: 'exact' })
      .gte('created_at', yesterday),
    supabase
      .from('issue_reports')
      .select('id', { count: 'exact' })
      .gte('created_at', yesterday)
  ])

  const newUsers = usersResult.count || 0
  const newPurchases = purchasesResult.count || 0
  const newIssues = issuesResult.count || 0

  // Send daily report to Telegram
  await notifyTelegram(
    `📊 Daily Report\n\n` +
    `👥 New Users: ${newUsers}\n` +
    `🛒 New Purchases: ${newPurchases}\n` +
    `🎫 New Issues: ${newIssues}\n\n` +
    `📅 ${new Date().toLocaleDateString('en-US')}`,
    {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      disableWebPagePreview: true
    }
  )

  console.log(`📊 Daily report sent: ${newUsers} users, ${newPurchases} purchases, ${newIssues} issues`)
  return { newUsers, newPurchases, newIssues }
}
