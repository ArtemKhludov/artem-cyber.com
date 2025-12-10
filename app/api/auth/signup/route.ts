import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email-service'
import { getWelcomeEmailTemplate } from '@/lib/email-templates'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, name, password, phone, callback_request_data } = body

        // Validate required fields
        if (!email || !name || !password) {
            return NextResponse.json(
                { error: 'Email, name, and password are required' },
                { status: 400 }
            )
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            )
        }

        // Validate password
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must contain at least 6 characters' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.trim())
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email: email.trim(),
                name: name.trim(),
                phone: phone?.trim() || null,
                password_hash: hashedPassword,
                role: 'user',
                email_verified: false
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating user:', createError)
            console.error('Error details:', JSON.stringify(createError, null, 2))
            return NextResponse.json(
                { error: 'Error creating user', details: createError.message },
                { status: 500 }
            )
        }

        // If callback request data exists, create it
        if (callback_request_data) {
            try {
                const { data: callbackRequest, error: callbackError } = await supabase
                    .from('callback_requests')
                    .insert({
                        name: callback_request_data.name,
                        phone: callback_request_data.phone,
                        email: callback_request_data.email,
                        preferred_time: callback_request_data.preferred_time,
                        message: callback_request_data.message,
                        source_page: callback_request_data.source_page,
                        product_type: callback_request_data.product_type,
                        product_name: callback_request_data.product_name,
                        notes: callback_request_data.notes,
                        source: 'website',
                        status: 'new',
                        user_id: newUser.id,
                        auto_created_user: true,
                        user_credentials_sent: true
                    })
                    .select()
                    .single()

                if (callbackError) {
                    console.error('Error creating callback request:', callbackError)
                } else {
                    console.log('Callback request created:', callbackRequest.id)
                }
            } catch (callbackError) {
                console.error('Callback request creation failed:', callbackError)
            }
        }

        // Send welcome email
        try {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                (process.env.NODE_ENV === 'development'
                    ? 'http://localhost:3000'
                    : 'https://www.energylogic-ai.com')

            const emailContent = getWelcomeEmailTemplate({
                name: newUser.name,
                email: newUser.email,
                tempPassword: password,
                loginUrl: `${baseUrl}/auth/login`
            })

            await sendEmail({
                to: newUser.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
            })

            console.log(`Welcome email sent to ${newUser.email}`)
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError)
            // Don't interrupt execution if email sending failed
        }

        // Send Telegram notification about new registration
        try {
            const telegramMessage = `🆕 New user registered:
👤 Name: ${newUser.name}
📧 Email: ${newUser.email}
📞 Phone: ${newUser.phone || 'Not provided'}
🔐 Registration type: Email/Password
✅ Email verified: No
📅 Date: ${new Date().toLocaleString('en-US')}`

            const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: telegramMessage,
                    parse_mode: 'HTML'
                })
            })

            if (!response.ok) {
                console.error('Telegram notification failed:', await response.text())
            } else {
                console.log('✅ Telegram notification sent')
            }
        } catch (telegramError) {
            console.error('Telegram error:', telegramError)
        }

        return NextResponse.json({
            success: true,
            message: 'User successfully created',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                phone: newUser.phone
            }
        })

    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
