import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()

        // Принудительно обновляем schema cache
        const { data, error } = await supabase.rpc('notify', {
            channel: 'pgrst',
            payload: 'reload schema'
        })

        if (error) {
            console.error('Schema refresh error:', error)
            return NextResponse.json({ 
                error: 'Failed to refresh schema',
                details: error.message 
            }, { status: 500 })
        }

        // Тестируем доступ к колонке google_id
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('id, email, name, google_id, avatar_url, email_verified')
            .limit(1)

        if (testError) {
            console.error('Schema test error:', testError)
            return NextResponse.json({ 
                error: 'Schema refresh failed - google_id still not accessible',
                details: testError.message 
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Schema cache refreshed successfully',
            testQuery: testData
        })

    } catch (error) {
        console.error('Schema refresh error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
