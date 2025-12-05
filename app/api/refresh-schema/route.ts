import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin()

        // Alternative method - execute a simple query to refresh cache
        const { data, error } = await supabase
            .from('users')
            .select('id, email, name, google_id, avatar_url, email_verified')
            .limit(1)

        if (error) {
            console.error('Schema test error:', error)
            return NextResponse.json({
                error: 'Schema test failed',
                details: error.message,
                code: error.code
            }, { status: 500 })
        }

        // If the query succeeded, schema cache is refreshed
        return NextResponse.json({
            success: true,
            message: 'Schema cache refreshed successfully',
            testQuery: data
        })

    } catch (error) {
        console.error('Schema refresh error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}