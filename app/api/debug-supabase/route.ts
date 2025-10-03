import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Debug Supabase connection...')
        
        const supabase = getSupabaseAdmin()
        
        // Тест 1: Проверяем подключение к users
        console.log('📡 Test 1: Connection to users table...')
        const { data: usersTest, error: usersError } = await supabase
            .from('users')
            .select('count')
            .limit(1)
        
        if (usersError) {
            console.error('❌ Users table error:', usersError)
            return NextResponse.json({ 
                error: 'Users table error',
                details: usersError.message,
                code: usersError.code
            }, { status: 500 })
        }
        
        console.log('✅ Users table accessible')
        
        // Тест 2: Проверяем доступ к user_sessions
        console.log('📡 Test 2: Access to user_sessions table...')
        const { data: sessionsTest, error: sessionsError } = await supabase
            .from('user_sessions')
            .select('count')
            .limit(1)
        
        if (sessionsError) {
            console.error('❌ User_sessions table error:', sessionsError)
            return NextResponse.json({ 
                error: 'User_sessions table error',
                details: sessionsError.message,
                code: sessionsError.code,
                hint: sessionsError.hint
            }, { status: 500 })
        }
        
        console.log('✅ User_sessions table accessible')
        
        // Тест 3: Проверяем создание тестовой сессии
        console.log('📡 Test 3: Creating test session...')
        const testSessionToken = crypto.randomUUID()
        const testUserId = '00000000-0000-0000-0000-000000000000'
        
        const { data: sessionCreate, error: sessionCreateError } = await supabase
            .from('user_sessions')
            .insert({
                user_id: testUserId,
                session_token: testSessionToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date().toISOString(),
                ip_address: '127.0.0.1',
                user_agent: 'debug-test',
                remember_me: false,
                csrf_secret: crypto.randomUUID()
            })
            .select()
            .single()
        
        if (sessionCreateError) {
            console.error('❌ Session creation error:', sessionCreateError)
            return NextResponse.json({ 
                error: 'Session creation failed',
                details: sessionCreateError.message,
                code: sessionCreateError.code,
                hint: sessionCreateError.hint
            }, { status: 500 })
        }
        
        console.log('✅ Session creation successful')
        
        // Тест 4: Читаем созданную сессию
        console.log('📡 Test 4: Reading created session...')
        const { data: sessionRead, error: sessionReadError } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('session_token', testSessionToken)
            .single()
        
        if (sessionReadError) {
            console.error('❌ Session read error:', sessionReadError)
            return NextResponse.json({ 
                error: 'Session read failed',
                details: sessionReadError.message,
                code: sessionReadError.code
            }, { status: 500 })
        }
        
        console.log('✅ Session read successful')
        
        // Тест 5: Удаляем тестовую сессию
        console.log('📡 Test 5: Cleaning up test session...')
        const { error: sessionDeleteError } = await supabase
            .from('user_sessions')
            .delete()
            .eq('session_token', testSessionToken)
        
        if (sessionDeleteError) {
            console.error('❌ Session delete error:', sessionDeleteError)
            return NextResponse.json({ 
                error: 'Session delete failed',
                details: sessionDeleteError.message,
                code: sessionDeleteError.code
            }, { status: 500 })
        }
        
        console.log('✅ Session cleanup successful')
        
        return NextResponse.json({
            success: true,
            message: 'All Supabase tests passed',
            tests: {
                users_table: '✅ Accessible',
                user_sessions_table: '✅ Accessible', 
                session_create: '✅ Successful',
                session_read: '✅ Successful',
                session_delete: '✅ Successful'
            },
            environment: {
                node_env: process.env.NODE_ENV,
                vercel: process.env.VERCEL,
                supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
                service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
            }
        })
        
    } catch (error) {
        console.error('❌ Critical error:', error)
        return NextResponse.json({ 
            error: 'Critical error',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
    }
}
