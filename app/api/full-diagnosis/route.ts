import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { validateSessionToken } from '@/lib/session'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
    const results = {
        timestamp: new Date().toISOString(),
        environment: {
            node_env: process.env.NODE_ENV,
            vercel: process.env.VERCEL,
            vercel_url: process.env.VERCEL_URL,
            supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
            service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
            google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
            google_client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ? 'Set' : 'Not set',
            google_redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'Not set',
            telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set',
            telegram_chat_id: process.env.TELEGRAM_CHAT_ID ? 'Set' : 'Not set'
        },
        tests: {} as any,
        errors: [] as string[],
        warnings: [] as string[],
        summary: {} as any,
        recommendations: [] as string[]
    }

    try {
        console.log('🔍 Starting full diagnosis...')

        // Test 1: Supabase connection
        console.log('📡 Test 1: Supabase connection...')
        try {
            const supabase = getSupabaseAdmin()
            const { data, error } = await supabase.from('users').select('count').limit(1)
            
            if (error) {
                results.tests.supabase_connection = '❌ Failed'
                results.errors.push(`Supabase connection failed: ${error.message}`)
            } else {
                results.tests.supabase_connection = '✅ Success'
            }
        } catch (error) {
            results.tests.supabase_connection = '❌ Failed'
            results.errors.push(`Supabase connection error: ${error}`)
        }

        // Test 2: Access to user_sessions
        console.log('📡 Test 2: User sessions table access...')
        try {
            const supabase = getSupabaseAdmin()
            const { data, error } = await supabase.from('user_sessions').select('count').limit(1)
            
            if (error) {
                results.tests.user_sessions_access = '❌ Failed'
                results.errors.push(`User sessions access failed: ${error.message}`)
            } else {
                results.tests.user_sessions_access = '✅ Success'
            }
        } catch (error) {
            results.tests.user_sessions_access = '❌ Failed'
            results.errors.push(`User sessions access error: ${error}`)
        }

        // Test 3: User creation
        console.log('📡 Test 3: User creation...')
        try {
            const supabase = getSupabaseAdmin()
            const testUserId = crypto.randomUUID()
            const testEmail = `diagnosis-test-${Date.now()}@example.com`
            
            const { data, error } = await supabase
                .from('users')
                .insert({
                    id: testUserId,
                    email: testEmail,
                    name: 'Diagnosis Test User',
                    password_hash: 'diagnosis-test-hash',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()
            
            if (error) {
                results.tests.user_creation = '❌ Failed'
                results.errors.push(`User creation failed: ${error.message}`)
            } else {
                results.tests.user_creation = '✅ Success'
                
                // Test 4: Session creation
                console.log('📡 Test 4: Session creation...')
                const testSessionToken = crypto.randomUUID()
                
                const { data: sessionData, error: sessionError } = await supabase
                    .from('user_sessions')
                    .insert({
                        user_id: testUserId,
                        session_token: testSessionToken,
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        last_activity: new Date().toISOString(),
                        ip_address: '127.0.0.1',
                        user_agent: 'diagnosis-test',
                        remember_me: false,
                        csrf_secret: crypto.randomUUID()
                    })
                    .select()
                    .single()
                
                if (sessionError) {
                    results.tests.session_creation = '❌ Failed'
                    results.errors.push(`Session creation failed: ${sessionError.message}`)
                } else {
                    results.tests.session_creation = '✅ Success'
                    
                    // Test 5: Session reading
                    console.log('📡 Test 5: Session reading...')
                    const { data: readData, error: readError } = await supabase
                        .from('user_sessions')
                        .select('*')
                        .eq('session_token', testSessionToken)
                        .single()
                    
                    if (readError) {
                        results.tests.session_reading = '❌ Failed'
                        results.errors.push(`Session reading failed: ${readError.message}`)
                    } else {
                        results.tests.session_reading = '✅ Success'
                        
                        // Test 6: Session validation
                        console.log('📡 Test 6: Session validation...')
                        try {
                            const validation = await validateSessionToken(testSessionToken, { supabase })
                            
                            if (!validation.session || !validation.user) {
                                results.tests.session_validation = '❌ Failed'
                                results.errors.push(`Session validation failed: ${validation.reason}`)
                            } else {
                                results.tests.session_validation = '✅ Success'
                            }
                        } catch (error) {
                            results.tests.session_validation = '❌ Failed'
                            results.errors.push(`Session validation error: ${error}`)
                        }
                    }
                    
                    // Cleanup session
                    await supabase.from('user_sessions').delete().eq('session_token', testSessionToken)
                }
                
                // Cleanup user
                await supabase.from('users').delete().eq('id', testUserId)
            }
        } catch (error) {
            results.tests.user_creation = '❌ Failed'
            results.errors.push(`User creation error: ${error}`)
        }

        // Test 7: Google OAuth configuration
        console.log('📡 Test 7: Google OAuth configuration...')
        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        const googleRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
        
        if (!googleClientId) {
            results.tests.google_oauth = '❌ Failed'
            results.errors.push('NEXT_PUBLIC_GOOGLE_CLIENT_ID not set')
        } else if (!googleClientSecret) {
            results.tests.google_oauth = '❌ Failed'
            results.errors.push('GOOGLE_OAUTH_CLIENT_SECRET not set')
        } else if (!googleRedirectUri) {
            results.tests.google_oauth = '❌ Failed'
            results.errors.push('GOOGLE_OAUTH_REDIRECT_URI not set')
        } else if (googleRedirectUri !== 'https://www.energylogic-ai.com/api/auth/oauth/google/callback') {
            results.tests.google_oauth = '⚠️ Warning'
            results.warnings.push(`Google redirect URI mismatch: ${googleRedirectUri}`)
        } else {
            results.tests.google_oauth = '✅ Success'
        }

        // Test 8: Telegram configuration
        console.log('📡 Test 8: Telegram configuration...')
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN
        const telegramChatId = process.env.TELEGRAM_CHAT_ID
        
        if (!telegramToken) {
            results.tests.telegram = '❌ Failed'
            results.errors.push('TELEGRAM_BOT_TOKEN not set')
        } else if (!telegramChatId) {
            results.tests.telegram = '❌ Failed'
            results.errors.push('TELEGRAM_CHAT_ID not set')
        } else {
            results.tests.telegram = '✅ Success'
        }

        // Test 9: URL configuration
        console.log('📡 Test 9: URL configuration...')
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        
        if (!siteUrl) {
            results.tests.url_config = '⚠️ Warning'
            results.warnings.push('NEXT_PUBLIC_SITE_URL not set')
        } else if (!siteUrl.includes('energylogic-ai.com')) {
            results.tests.url_config = '⚠️ Warning'
            results.warnings.push(`NEXT_PUBLIC_SITE_URL mismatch: ${siteUrl}`)
        } else {
            results.tests.url_config = '✅ Success'
        }

        // Test 10: RLS policies check
        console.log('📡 Test 10: RLS policies check...')
        try {
            const supabase = getSupabaseAdmin()
            
            // Try to create session with service role
            const testUserId = crypto.randomUUID()
            const testSessionToken = crypto.randomUUID()
            
            const { data, error } = await supabase
                .from('user_sessions')
                .insert({
                    user_id: testUserId,
                    session_token: testSessionToken,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    last_activity: new Date().toISOString(),
                    ip_address: '127.0.0.1',
                    user_agent: 'rls-test',
                    remember_me: false,
                    csrf_secret: crypto.randomUUID()
                })
                .select()
                .single()
            
            if (error) {
                if (error.message.includes('RLS') || error.message.includes('policy')) {
                    results.tests.rls_policies = '❌ Failed'
                    results.errors.push(`RLS policies issue: ${error.message}`)
                } else {
                    results.tests.rls_policies = '⚠️ Warning'
                    results.warnings.push(`RLS test failed (expected): ${error.message}`)
                }
            } else {
                results.tests.rls_policies = '✅ Success'
                // Cleanup
                await supabase.from('user_sessions').delete().eq('session_token', testSessionToken)
            }
        } catch (error) {
            results.tests.rls_policies = '❌ Failed'
            results.errors.push(`RLS policies error: ${error}`)
        }

        // Final assessment
        const totalTests = Object.keys(results.tests).length
        const passedTests = Object.values(results.tests).filter(test => test === '✅ Success').length
        const failedTests = Object.values(results.tests).filter(test => test === '❌ Failed').length
        const warningTests = Object.values(results.tests).filter(test => test === '⚠️ Warning').length

        results.summary = {
            total_tests: totalTests,
            passed: passedTests,
            failed: failedTests,
            warnings: warningTests,
            success_rate: Math.round((passedTests / totalTests) * 100)
        }

        // Recommendations
        results.recommendations = []
        
        if (failedTests > 0) {
            results.recommendations.push('❌ Critical errors require immediate fixing')
        }
        
        if (warningTests > 0) {
            results.recommendations.push('⚠️ Warnings should be fixed for stable operation')
        }
        
        if (results.errors.some(error => error.includes('RLS'))) {
            results.recommendations.push('🔧 Execute SQL script to fix RLS policies in Supabase')
        }
        
        if (results.errors.some(error => error.includes('Google'))) {
            results.recommendations.push('🔧 Check Google Cloud Console settings')
        }
        
        if (results.errors.some(error => error.includes('Telegram'))) {
            results.recommendations.push('🔧 Check Telegram bot settings')
        }

        console.log('✅ Full diagnosis completed')
        
        return NextResponse.json(results, { 
            status: failedTests > 0 ? 500 : 200 
        })

    } catch (error) {
        console.error('❌ Critical diagnosis error:', error)
        
        results.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.summary = {
            total_tests: 0,
            passed: 0,
            failed: 1,
            warnings: 0,
            success_rate: 0
        }
        
        return NextResponse.json(results, { status: 500 })
    }
}
