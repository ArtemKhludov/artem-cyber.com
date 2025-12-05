import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/session'
import { sendEmail } from '@/lib/notify'

async function requireAdmin(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        let sessionToken = authHeader?.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : undefined
        if (!sessionToken) {
            sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
        }

        const validation = await validateSessionToken(sessionToken, { touch: false })
        if (!validation.user || validation.user.role !== 'admin') {
            return { success: false, error: 'Forbidden', status: 403 }
        }

        return {
            success: true,
            userId: validation.session?.user_id || validation.user.id,
            userEmail: validation.user.email
        }
    } catch (error) {
        return { success: false, error: 'Unauthorized', status: 401 }
    }
}

export async function POST(request: NextRequest) {
    try {
        // Validate admin permissions
        const adminResult = await requireAdmin(request)
        if (!adminResult.success) {
            return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
        }

        const { userId, purchaseId, customMessage } = await request.json()

        if (!userId && !purchaseId) {
            return NextResponse.json({ error: 'userId or purchaseId is required' }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Fetch purchase info
        let purchase
        if (purchaseId) {
            const { data: purchaseData, error: purchaseError } = await supabase
                .from('purchases')
                .select(`
          id,
          user_id,
          user_email,
          product_name,
          amount_paid,
          currency,
          status,
          grace_period_until,
          user_course_access!inner(
            id,
            document_id,
            is_grace_period
          )
        `)
                .eq('id', purchaseId)
                .single()

            if (purchaseError || !purchaseData) {
                return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
            }

            purchase = purchaseData
        } else {
            // Fetch latest grace-period purchase for user
            const { data: purchaseData, error: purchaseError } = await supabase
                .from('purchases')
                .select(`
          id,
          user_id,
          user_email,
          product_name,
          amount_paid,
          currency,
          status,
          grace_period_until,
          user_course_access!inner(
            id,
            document_id,
            is_grace_period
          )
        `)
                .eq('user_id', userId)
                .eq('grace_period_verified', false)
                .not('grace_period_until', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (purchaseError || !purchaseData) {
                return NextResponse.json({ error: 'Grace period purchase not found' }, { status: 404 })
            }

            purchase = purchaseData
        }

        // Fetch user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name, phone')
            .eq('id', purchase.user_id)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Calculate remaining grace period time
        const gracePeriodEnd = new Date(purchase.grace_period_until)
        const now = new Date()
        const timeRemaining = Math.max(0, gracePeriodEnd.getTime() - now.getTime())
        const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60))

        // Build message
        const defaultMessage = customMessage || `
Your access to the course "${purchase.product_name}" is being verified for payment.

⏰ Verification time: ${minutesRemaining} minutes
💳 Amount: ${purchase.amount_paid} ${purchase.currency}
📧 Contact email: ${user.email}

We are checking your payment and will confirm access soon.
If you have questions, please contact support.
    `.trim()

        // Send email
        const emailResult = await sendEmail({
            to: user.email,
            subject: `Payment verification: ${purchase.product_name}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Payment verification</h2>
          <p>Hello, ${user.name || 'customer'}!</p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">Your access is being verified</h3>
            <p style="color: #856404; white-space: pre-wrap;">${defaultMessage}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Order details:</h4>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Course:</strong> ${purchase.product_name}</li>
              <li><strong>Amount:</strong> ${purchase.amount_paid} ${purchase.currency}</li>
              <li><strong>Verification window:</strong> ${minutesRemaining} minutes</li>
            </ul>
          </div>
          
          <p>If you have any questions about payment, please reach out to our support team.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply directly.
          </p>
        </div>
      `,
            text: `
Payment verification

Hello, ${user.name || 'customer'}!

Your access is being verified

${defaultMessage}

Order details:
- Course: ${purchase.product_name}
- Amount: ${purchase.amount_paid} ${purchase.currency}
- Verification window: ${minutesRemaining} minutes

If you have questions about your payment, please contact our support team.

---
This is an automated message.
      `
        })

        // Log notification dispatch
        await supabase.from('audit_logs').insert({
            user_id: adminResult.userId,
            action: 'send_pending_payment_notification',
            target_type: 'user',
            target_id: user.id,
            metadata: {
                purchase_id: purchase.id,
                user_email: user.email,
                product_name: purchase.product_name,
                minutes_remaining: minutesRemaining,
                email_sent: emailResult.ok,
                custom_message: !!customMessage
            }
        })

        return NextResponse.json({
            success: true,
            message: `Notification sent to ${user.email}`,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                },
                purchase: {
                    id: purchase.id,
                    product_name: purchase.product_name,
                    amount_paid: purchase.amount_paid,
                    currency: purchase.currency
                },
                gracePeriod: {
                    until: purchase.grace_period_until,
                    minutesRemaining
                },
                emailSent: emailResult.ok
            }
        })

    } catch (error) {
        console.error('Send pending payment notification error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
