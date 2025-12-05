import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''
        const sortBy = searchParams.get('sortBy') || 'created_at'
        const sortOrder = searchParams.get('sortOrder') || 'desc'

        let query = supabase
            .from('crm_users')
            .select('*', { count: 'exact' })

        // Search by name, phone or email
        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
        }

        // Sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })

        // Pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch user data' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            count: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, phone, email, notes, source = 'manual' } = body

        // Validate required fields
        if (!name || !phone) {
            return NextResponse.json(
                { error: 'Name and phone are required' },
                { status: 400 }
            )
        }

        // Check if CRM user with this phone exists
        const { data: existingUser } = await supabase
            .from('crm_users')
            .select('id')
            .eq('phone', phone)
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this phone already exists' },
                { status: 400 }
            )
        }

        // Create new CRM user
        const { data, error } = await supabase
            .from('crm_users')
            .insert([{
                name: name.trim(),
                phone: phone.trim(),
                email: email?.trim() || null,
                notes: notes?.trim() || null,
                source: source
            }])
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'User created successfully',
            data: data
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}