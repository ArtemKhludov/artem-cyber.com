import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const envVars = {
            // Google OAuth
            NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
            
            // Supabase
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
            
            // URLs
            NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            APP_URL: process.env.APP_URL,
            VERCEL_URL: process.env.VERCEL_URL,
            
            // Environment
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            
            // Telegram
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set',
            TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ? 'Set' : 'Not set',
            
            // Email
            RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
            NOTIFY_SENDER_EMAIL: process.env.NOTIFY_SENDER_EMAIL
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            environment: envVars,
            analysis: {
                google_oauth_configured: !!(envVars.NEXT_PUBLIC_GOOGLE_CLIENT_ID && envVars.GOOGLE_OAUTH_CLIENT_SECRET),
                supabase_configured: !!(envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.SUPABASE_SERVICE_ROLE_KEY === 'Set'),
                urls_configured: !!(envVars.NEXT_PUBLIC_SITE_URL || envVars.NEXT_PUBLIC_APP_URL),
                is_production: envVars.NODE_ENV === 'production' || envVars.VERCEL === '1'
            }
        })

    } catch (error) {
        return NextResponse.json({ 
            error: 'Failed to get environment variables',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
