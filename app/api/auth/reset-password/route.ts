import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyRequestOriginSmart } from '@/lib/security'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        // Check origin for CSRF protection
        try {
            verifyRequestOriginSmart(request, {
                allowSameDomain: true
            })
        } catch (error) {
            console.error('Origin verification failed for reset password:', error)
            return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
        }

        const { token, password } = await request.json()

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must contain at least 6 characters' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Check token
        const { data: resetToken, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('user_id, expires_at')
            .eq('token', token)
            .single()

        if (tokenError || !resetToken) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
        }

        // Check if token has expired
        const now = new Date()
        const expiresAt = new Date(resetToken.expires_at)

        if (now > expiresAt) {
            // Delete expired token
            await supabase
                .from('password_reset_tokens')
                .delete()
                .eq('token', token)

            return NextResponse.json({ error: 'Token expired. Please request password recovery again' }, { status: 400 })
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Update user password
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', resetToken.user_id)

        if (updateError) {
            console.error('Error updating password:', updateError)
            return NextResponse.json({ error: 'Error updating password' }, { status: 500 })
        }

        // Delete used token
        await supabase
            .from('password_reset_tokens')
            .delete()
            .eq('token', token)

        // Revoke all active user sessions for security
        await supabase
            .from('user_sessions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('user_id', resetToken.user_id)
            .is('revoked_at', null)

        console.log(`Password reset successful for user ${resetToken.user_id}`)

        return NextResponse.json({
            success: true,
            message: 'Password successfully changed. You can sign in with your new password'
        })

    } catch (error) {
        console.error('Error in reset password:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token not provided' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Check token
        const { data: resetToken, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('user_id, expires_at')
            .eq('token', token)
            .single()

        if (tokenError || !resetToken) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
        }

        // Check if token has expired
        const now = new Date()
        const expiresAt = new Date(resetToken.expires_at)

        if (now > expiresAt) {
            return NextResponse.json({ error: 'Token expired' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: 'Token is valid'
        })

    } catch (error) {
        console.error('Error validating reset token:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}