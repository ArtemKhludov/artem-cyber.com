import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Debug Google OAuth configuration...')
        
        const results = {
            timestamp: new Date().toISOString(),
            environment: {
                node_env: process.env.NODE_ENV,
                vercel: process.env.VERCEL,
                google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
                google_client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ? 'Set' : 'Not set',
                google_redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'Not set',
                site_url: process.env.NEXT_PUBLIC_SITE_URL || 'Not set',
                app_url: process.env.NEXT_PUBLIC_APP_URL || 'Not set'
            },
            tests: {} as any,
            errors: [] as string[],
            warnings: [] as string[],
            summary: {} as any,
            recommendations: [] as string[]
        }

        // Тест 1: Проверяем переменные окружения
        console.log('📡 Test 1: Environment variables...')
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI

        if (!clientId) {
            results.tests.env_variables = '❌ Failed'
            results.errors.push('NEXT_PUBLIC_GOOGLE_CLIENT_ID not set')
        } else if (!clientSecret) {
            results.tests.env_variables = '❌ Failed'
            results.errors.push('GOOGLE_OAUTH_CLIENT_SECRET not set')
        } else if (!redirectUri) {
            results.tests.env_variables = '❌ Failed'
            results.errors.push('GOOGLE_OAUTH_REDIRECT_URI not set')
        } else {
            results.tests.env_variables = '✅ Success'
        }

        // Тест 2: Проверяем redirect URI
        console.log('📡 Test 2: Redirect URI validation...')
        const expectedRedirectUri = 'https://www.energylogic-ai.com/api/auth/oauth/google/callback'
        
        if (redirectUri !== expectedRedirectUri) {
            results.tests.redirect_uri = '❌ Failed'
            results.errors.push(`Redirect URI mismatch: expected ${expectedRedirectUri}, got ${redirectUri}`)
        } else {
            results.tests.redirect_uri = '✅ Success'
        }

        // Тест 3: Проверяем Google OAuth endpoint
        console.log('📡 Test 3: Google OAuth endpoint...')
        try {
            const response = await fetch('https://www.energylogic-ai.com/api/auth/oauth/google/callback', {
                method: 'GET',
                headers: {
                    'User-Agent': 'Debug-Test'
                }
            })
            
            if (response.status === 307 || response.status === 302) {
                results.tests.oauth_endpoint = '✅ Success (redirects as expected)'
            } else {
                results.tests.oauth_endpoint = `⚠️ Warning (status: ${response.status})`
                results.warnings.push(`OAuth endpoint returned status ${response.status}`)
            }
        } catch (error) {
            results.tests.oauth_endpoint = '❌ Failed'
            results.errors.push(`OAuth endpoint error: ${error}`)
        }

        // Тест 4: Проверяем Google OAuth route
        console.log('📡 Test 4: Google OAuth route...')
        try {
            const response = await fetch('https://www.energylogic-ai.com/api/auth/oauth/google', {
                method: 'GET',
                headers: {
                    'User-Agent': 'Debug-Test'
                }
            })
            
            if (response.status === 405 || response.status === 400) {
                results.tests.oauth_route = '✅ Success (method not allowed as expected)'
            } else {
                results.tests.oauth_route = `⚠️ Warning (status: ${response.status})`
                results.warnings.push(`OAuth route returned status ${response.status}`)
            }
        } catch (error) {
            results.tests.oauth_route = '❌ Failed'
            results.errors.push(`OAuth route error: ${error}`)
        }

        // Тест 5: Проверяем Google Cloud Console настройки
        console.log('📡 Test 5: Google Cloud Console settings...')
        results.tests.google_console = '⚠️ Manual Check Required'
        results.warnings.push('Please verify Google Cloud Console settings:')
        results.warnings.push('1. Authorized JavaScript origins: https://www.energylogic-ai.com')
        results.warnings.push('2. Authorized redirect URIs: https://www.energylogic-ai.com/api/auth/oauth/google/callback')
        results.warnings.push('3. OAuth consent screen is configured')
        results.warnings.push('4. Client ID and Secret are correct')

        // Итоговая оценка
        const totalTests = Object.keys(results.tests).length
        const passedTests = Object.values(results.tests).filter(test => test === '✅ Success').length
        const failedTests = Object.values(results.tests).filter(test => test === '❌ Failed').length
        const warningTests = Object.values(results.tests).filter(test => test === '⚠️ Warning' || test === '⚠️ Manual Check Required').length

        results.summary = {
            total_tests: totalTests,
            passed: passedTests,
            failed: failedTests,
            warnings: warningTests,
            success_rate: Math.round((passedTests / totalTests) * 100)
        }

        // Рекомендации
        results.recommendations = []
        
        if (failedTests > 0) {
            results.recommendations.push('❌ Критические ошибки требуют немедленного исправления')
        }
        
        if (warningTests > 0) {
            results.recommendations.push('⚠️ Предупреждения следует исправить для стабильной работы')
        }
        
        if (results.errors.some(error => error.includes('Redirect URI'))) {
            results.recommendations.push('🔧 Проверьте GOOGLE_OAUTH_REDIRECT_URI в Vercel')
        }
        
        if (results.errors.some(error => error.includes('not set'))) {
            results.recommendations.push('🔧 Добавьте недостающие переменные окружения в Vercel')
        }

        console.log('✅ Google OAuth debug completed')
        
        return NextResponse.json(results, { 
            status: failedTests > 0 ? 500 : 200 
        })

    } catch (error) {
        console.error('❌ Critical Google OAuth debug error:', error)
        
        return NextResponse.json({ 
            error: 'Critical error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
