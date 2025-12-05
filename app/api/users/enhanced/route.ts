import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple users API without complex logic
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''

        console.log('🔍 API request:', { page, limit, search })

        // Use working search_users function
        const { data: users, error } = await supabase
            .rpc('search_users', {
                search_term: search || null,
                limit_count: limit,
                offset_count: (page - 1) * limit
            })

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch user data' },
                { status: 500 }
            )
        }

        console.log('📊 Users fetched:', users?.length || 0)

        // search_users function already returns data with activity_status
        const usersWithStatus = users || []

        console.log('📄 Returning users:', usersWithStatus.length)

        return NextResponse.json({
            success: true,
            data: usersWithStatus,
            count: usersWithStatus.length,
            page,
            limit,
            totalPages: Math.ceil(usersWithStatus.length / limit)
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}