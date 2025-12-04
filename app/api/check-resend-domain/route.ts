import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const apiKey = process.env.RESEND_API_KEY
        const domain = 'energylogic-ai.com'

        if (!apiKey) {
            return NextResponse.json({
                error: 'RESEND_API_KEY not configured'
            }, { status: 500 })
        }

        console.log(`🔍 Checking Resend domain status for: ${domain}`)

        // Check domain status via Resend API
        const response = await fetch('https://api.resend.com/domains', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Resend API error:', response.status, errorText)
            return NextResponse.json({
                error: 'Failed to check domain status',
                status: response.status,
                details: errorText
            }, { status: response.status })
        }

        const data = await response.json()
        console.log('✅ Resend domains response:', data)

        // Find our domain
        const ourDomain = data.data?.find((d: any) => d.name === domain)

        if (!ourDomain) {
            return NextResponse.json({
                error: 'Domain not found in Resend',
                domain: domain,
                availableDomains: data.data?.map((d: any) => d.name) || []
            }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            domain: ourDomain,
            status: ourDomain.status,
            verification: ourDomain.verification,
            dnsRecords: ourDomain.records || [],
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('❌ Domain check failed:', error)
        return NextResponse.json({
            error: 'Failed to check domain',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
