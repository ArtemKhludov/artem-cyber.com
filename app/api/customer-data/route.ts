import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const { name, email, phone, country, orderData } = await request.json()

        if (!name || !email || !phone || !country) {
            return NextResponse.json({
                success: false,
                error: 'All fields are required'
            }, { status: 400 })
        }

        console.log('💾 Saving customer data:', email)

        // Check if user exists by email
        const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single()

        let userId: string

        if (userCheckError && userCheckError.code === 'PGRST116') {
            // User does not exist, create a new one
            const { data: newUser, error: createUserError } = await supabase
                .from('users')
                .insert({
                    email: email.toLowerCase(),
                    name: name.trim(),
                    phone: phone.trim(),
                    role: 'user',
                    is_active: true,
                    email_verified: false
                })
                .select('id')
                .single()

            if (createUserError) {
                console.error('❌ User creation error:', createUserError)
                return NextResponse.json({
                    success: false,
                    error: 'Failed to create user',
                    details: createUserError.message
                }, { status: 500 })
            }

            userId = newUser.id
            console.log('✅ Created new user:', email)
        } else if (userCheckError) {
            console.error('❌ User check error:', userCheckError)
            return NextResponse.json({
                success: false,
                error: 'User check failed'
            }, { status: 500 })
        } else {
            // User exists, update data
            userId = existingUser.id

            const { error: updateUserError } = await supabase
                .from('users')
                .update({
                    name: name.trim(),
                    phone: phone.trim()
                })
                .eq('id', userId)

            if (updateUserError) {
                console.error('❌ User update error:', updateUserError)
                return NextResponse.json({
                    success: false,
                    error: 'Failed to update user'
                }, { status: 500 })
            }

            console.log('✅ Updated user data:', email)
        }

        // Save order data into purchase_requests
        if (orderData) {
            const { error: purchaseError } = await supabase
                .from('purchase_requests')
                .insert({
                    name: name.trim(),
                    email: email.toLowerCase(),
                    phone: phone.trim(),
                    product_type: orderData.productType || 'pdf',
                    product_name: orderData.productName || 'PDF document',
                    product_id: orderData.productId || null,
                    amount: orderData.amount || 0,
                    currency: orderData.currency || 'RUB',
                    status: 'new',
                    payment_method: orderData.paymentMethod || 'stripe',
                    priority: 'medium',
                    source: 'website',
                    notes: `Country: ${country}`
                })

            if (purchaseError) {
                console.error('❌ Order save error:', purchaseError)
                return NextResponse.json({
                    success: false,
                    error: 'Failed to save order',
                    details: purchaseError.message
                }, { status: 500 })
            }

            console.log('✅ Saved order for user:', email)
        }

        return NextResponse.json({
            success: true,
            message: 'Customer data saved successfully',
            userId: userId
        })

    } catch (error) {
        console.error('❌ Error saving customer data:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    }
}
