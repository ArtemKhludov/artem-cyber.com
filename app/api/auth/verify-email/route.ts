import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Check if user exists
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (user.email_verified) {
            return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Save token in DB
        const { error: updateError } = await supabase
            .from('users')
            .update({
                verification_token: verificationToken,
                verification_expires: expiresAt.toISOString()
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Verification token update error:', updateError)
            return NextResponse.json({ error: 'Failed to create verification token' }, { status: 500 })
        }

        // Send email (hook up your provider here)
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${verificationToken}`

        // TODO: integrate with email provider (SendGrid, Mailgun, etc.)
        console.log('📧 Verification email:', {
            to: email,
            subject: 'Confirm your email address',
            verificationUrl: verificationUrl
        })

        return NextResponse.json({
            message: 'Verification email sent',
            verificationUrl: verificationUrl // For testing
        })

    } catch (error) {
        console.error('Email verification error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Verification token not found' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Find user by token
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('verification_token', token)
            .single()

        if (!user) {
            return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 })
        }

        // Check token expiration
        if (new Date() > new Date(user.verification_expires)) {
            return NextResponse.json({ error: 'Verification token expired' }, { status: 400 })
        }

        // Confirm email
        const { error: updateError } = await supabase
            .from('users')
            .update({
                email_verified: true,
                verification_token: null,
                verification_expires: null
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Email verification update error:', updateError)
            return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 })
        }

        return NextResponse.json({
            message: 'Email verified',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        })

    } catch (error) {
        console.error('Email verification error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
