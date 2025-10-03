import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { code, redirect_uri } = await request.json()
        
        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 })
        }

        console.log('🔍 Testing Google OAuth token exchange...')
        console.log('Code:', code.substring(0, 20) + '...')
        console.log('Redirect URI:', redirect_uri)

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        const actualRedirectUri = redirect_uri || 'https://www.energylogic-ai.com/api/auth/oauth/google/callback'

        if (!clientId || !clientSecret) {
            return NextResponse.json({ 
                error: 'Google OAuth not configured',
                details: {
                    clientId: clientId ? 'Set' : 'Not set',
                    clientSecret: clientSecret ? 'Set' : 'Not set'
                }
            }, { status: 500 })
        }

        // Test token exchange
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: actualRedirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        })

        const responseText = await tokenResponse.text()
        console.log('Token response status:', tokenResponse.status)
        console.log('Token response body:', responseText)

        if (!tokenResponse.ok) {
            return NextResponse.json({
                error: 'Token exchange failed',
                status: tokenResponse.status,
                response: responseText,
                request: {
                    client_id: clientId,
                    redirect_uri: actualRedirectUri,
                    grant_type: 'authorization_code'
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
        console.error('Google OAuth test error:', error)
        return NextResponse.json({ 
            error: 'Test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
