import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const testCode = url.searchParams.get('code')
        
        if (!testCode) {
            return NextResponse.json({
                error: 'No test code provided',
                usage: 'Add ?code=YOUR_GOOGLE_OAUTH_CODE to test'
            }, { status: 400 })
        }

        console.log('🧪 Testing OAuth flow with code:', testCode.substring(0, 20) + '...')

        // Get environment variables
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://www.energylogic-ai.com/api/auth/oauth/google/callback'

        console.log('🔍 Environment check:')
        console.log('Client ID:', clientId ? clientId.substring(0, 20) + '...' : 'NOT SET')
        console.log('Client Secret:', clientSecret ? clientSecret.substring(0, 10) + '...' : 'NOT SET')
        console.log('Redirect URI:', redirectUri)

        if (!clientId || !clientSecret) {
            return NextResponse.json({
                error: 'Missing environment variables',
                clientId: clientId ? 'Set' : 'Missing',
                clientSecret: clientSecret ? 'Set' : 'Missing',
                redirectUri: redirectUri
            }, { status: 500 })
        }

        // Test token exchange
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: testCode,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        })

        const responseText = await tokenResponse.text()
        console.log('Token response status:', tokenResponse.status)
        console.log('Token response body:', responseText)

        if (!tokenResponse.ok) {
            let errorData
            try {
                errorData = JSON.parse(responseText)
            } catch {
                errorData = responseText
            }

            return NextResponse.json({
                error: 'Token exchange failed',
                status: tokenResponse.status,
                response: errorData,
                request: {
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                    code: testCode.substring(0, 20) + '...'
                }
            }, { status: tokenResponse.status })
        }

        const tokenData = JSON.parse(responseText)
        
        // Test user info fetch
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })

        const userData = await userResponse.json()
        console.log('User info response:', userData)

        return NextResponse.json({
            success: true,
            tokenData: {
                access_token: tokenData.access_token?.substring(0, 20) + '...',
                token_type: tokenData.token_type,
                expires_in: tokenData.expires_in,
                scope: tokenData.scope
            },
            userData: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                picture: userData.picture
            }
        })

    } catch (error) {
        console.error('OAuth flow test error:', error)
        return NextResponse.json({ 
            error: 'Test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
