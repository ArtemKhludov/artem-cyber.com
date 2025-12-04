import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
    try {
        const { email, testType = 'simple' } = await request.json()

        if (!email) {
            return NextResponse.json({ 
                error: 'Email is required' 
            }, { status: 400 })
        }

        console.log(`🧪 Testing Resend email to: ${email}`)
        console.log(`🧪 Test type: ${testType}`)

        let emailContent
        let subject

        switch (testType) {
            case 'welcome':
                subject = '🧪 Resend Test - Welcome'
                emailContent = {
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2563eb;">🧪 Resend Test</h1>
                            <p>This is a test email to verify Resend on domain energylogic-ai.com</p>
                            <p><strong>Sent at:</strong> ${new Date().toLocaleString('en-US')}</p>
                            <p><strong>Test type:</strong> Welcome Email</p>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 14px;">
                                If you received this email, Resend works correctly!
                            </p>
                        </div>
                    `,
                    text: `🧪 Resend Test - Welcome\n\nThis is a test email to verify Resend on energylogic-ai.com\nSent at: ${new Date().toLocaleString('en-US')}\nTest type: Welcome Email\n\nIf you received this email, Resend works correctly!`
                }
                break

            case 'callback':
                subject = '🧪 Resend Test - Callback'
                emailContent = {
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2563eb;">🧪 Resend Test</h1>
                            <p>This is a test email to verify Resend on domain energylogic-ai.com</p>
                            <p><strong>Sent at:</strong> ${new Date().toLocaleString('en-US')}</p>
                            <p><strong>Test type:</strong> Callback Email</p>
                            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <h3>Test request details:</h3>
                                <p><strong>Name:</strong> Test User</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                                <p><strong>Message:</strong> This is a test callback request</p>
                            </div>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 14px;">
                                If you received this email, Resend works correctly!
                            </p>
                        </div>
                    `,
                    text: `🧪 Resend Test - Callback\n\nThis is a test email to verify Resend on energylogic-ai.com\nSent at: ${new Date().toLocaleString('en-US')}\nTest type: Callback Email\n\nTest request details:\nName: Test User\nEmail: ${email}\nPhone: +1 (555) 123-4567\nMessage: This is a test callback request\n\nIf you received this email, Resend works correctly!`
                }
                break

            default:
                subject = '🧪 Resend Test - Simple email'
                emailContent = {
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2563eb;">🧪 Resend Test</h1>
                            <p>This is a test email to verify Resend on domain energylogic-ai.com</p>
                            <p><strong>Sent at:</strong> ${new Date().toLocaleString('en-US')}</p>
                            <p><strong>Test type:</strong> Simple Email</p>
                            <hr style="margin: 20px 0;">
                            <p style="color: #666; font-size: 14px;">
                                If you received this email, Resend works correctly!
                            </p>
                        </div>
                    `,
                    text: `🧪 Resend Test - Simple email\n\nThis is a test email to verify Resend on energylogic-ai.com\nSent at: ${new Date().toLocaleString('en-US')}\nTest type: Simple Email\n\nIf you received this email, Resend works correctly!`
                }
        }

        const result = await sendEmail({
            to: email,
            subject: subject,
            html: emailContent.html,
            text: emailContent.text
        })

        console.log(`✅ Resend test email sent successfully:`, result)

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
            result: result,
            testType: testType,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('❌ Resend test failed:', error)
        return NextResponse.json({ 
            error: 'Failed to send test email',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const email = url.searchParams.get('email')
        const testType = url.searchParams.get('type') || 'simple'

        if (!email) {
            return NextResponse.json({ 
                error: 'Email parameter is required',
                usage: 'Add ?email=your@email.com&type=simple|welcome|callback'
            }, { status: 400 })
        }

        // Reuse POST logic
        const response = await POST(request)
        return response

    } catch (error) {
        console.error('❌ Resend test failed:', error)
        return NextResponse.json({ 
            error: 'Failed to send test email',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
