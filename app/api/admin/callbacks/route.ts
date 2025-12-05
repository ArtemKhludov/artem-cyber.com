import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import {
    SESSION_COOKIE_NAME,
    validateSessionToken
} from '@/lib/session'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const offset = (page - 1) * limit

        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const user = validation.user

        // Check that user is admin
        if (user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            )
        }

        // Build query
        let query = supabase
            .from('callback_requests_with_conversations')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        // Filter by status
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        // Search
        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,message.ilike.%${search}%`)
        }

        // Pagination
        query = query.range(offset, offset + limit - 1)

        const { data: callbacks, error, count } = await query

        if (error) {
            console.error('Error fetching admin callbacks:', error)
            return NextResponse.json(
                { error: 'Failed to fetch callbacks' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: callbacks || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status, priority, tags, admin_notes } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Callback ID is required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
        const validation = await validateSessionToken(sessionToken, { supabase })

        if (!validation.session || !validation.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const user = validation.user

        // Check that user is admin
        if (user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            )
        }

        const updateData: any = {}

        if (status) {
            updateData.status = status
            if (status === 'contacted') {
                updateData.contacted_at = new Date().toISOString()
            } else if (status === 'completed') {
                updateData.completed_at = new Date().toISOString()
            }
        }

        if (priority) {
            updateData.priority = priority
        }

        if (tags) {
            updateData.tags = tags
        }

        if (admin_notes !== undefined) {
            updateData.admin_notes = admin_notes
        }

        const { data, error } = await supabase
            .from('callback_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating callback:', error)
            return NextResponse.json(
                { error: 'Failed to update callback' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data
        })

    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}