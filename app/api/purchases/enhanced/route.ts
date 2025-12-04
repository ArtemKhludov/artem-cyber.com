import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyPaymentTelegram } from '@/lib/notify'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Notifications to the Payments topic
async function sendTelegramNotification(message: string) {
    await notifyPaymentTelegram(message)
}

// Create purchase with automatic user linking
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            name,
            phone,
            email,
            product_name,
            product_type,
            amount,
            currency = 'RUB',
            payment_method,
            status = 'pending',
            notes,
            source = 'manual'
        } = body

        // Validate required fields
        if (!name || !phone || !product_name || !amount) {
            return NextResponse.json(
                { error: 'Name, phone, product title, and amount are required' },
                { status: 400 }
            )
        }

        // Normalize data
        const normalizedPhone = phone.trim()
        const normalizedEmail = email ? email.trim().toLowerCase() : null
        const normalizedName = name.trim()

        // Validate phone format
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
        if (!phoneRegex.test(normalizedPhone)) {
            return NextResponse.json(
                { error: 'Invalid phone format' },
                { status: 400 }
            )
        }

        // Validate email format
        if (normalizedEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(normalizedEmail)) {
                return NextResponse.json(
                    { error: 'Invalid email format' },
                    { status: 400 }
                )
            }
        }

        // Validate amount
        const numericAmount = parseFloat(amount)
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be a positive number' },
                { status: 400 }
            )
        }

        // Create purchase - trigger will automatically create/find the user
        const { data, error } = await supabase
            .from('purchase_requests')
            .insert([
                {
                    name: normalizedName,
                    phone: normalizedPhone,
                    email: normalizedEmail,
                    product_name: product_name.trim(),
                    product_type: product_type || 'product',
                    amount: numericAmount,
                    currency: currency,
                    payment_method: payment_method || 'unknown',
                    status: status,
                    notes: notes?.trim() || null,
                    source: source
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Error creating purchase', details: error.message },
                { status: 500 }
            )
        }

        // Send notification to Telegram
        const telegramMessage = `🛒 New purchase from the CRM system:
👤 Name: ${normalizedName}
📧 Email: ${normalizedEmail || 'Not specified'}
📞 Phone: ${normalizedPhone}
📦 Product type: ${product_type || 'product'}
🛍️ Title: ${product_name}
💰 Amount: ${numericAmount} ${currency}
💳 Payment method: ${payment_method || 'unknown'}
📝 Status: ${status}
📝 Notes: ${notes || 'None'}
🌐 Source: ${source}
🆔 Purchase ID: ${data.id}`

        await sendTelegramNotification(telegramMessage)

        return NextResponse.json({
            success: true,
            message: 'Purchase successfully created',
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

// Fetch purchases with user information
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const userId = searchParams.get('userId')
        const status = searchParams.get('status')

        let query = supabase
            .from('purchase_requests')
            .select(`
                *,
                crm_users!inner(
                    id,
                    name,
                    phone,
                    email,
                    total_purchases,
                    total_spent
                )
            `)
            .order('created_at', { ascending: false })

        // Filter by user
        if (userId) {
            query = query.eq('user_id', userId)
        }

        // Filter by status
        if (status) {
            query = query.eq('status', status)
        }

        // Pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json(
                { error: 'Error fetching purchase data' },
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
