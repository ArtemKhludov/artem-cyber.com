import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        const state = url.searchParams.get('state')

        console.log('🔍 Debug OAuth Callback:')
        console.log('Code:', code ? code.substring(0, 20) + '...' : 'No code')
        console.log('Error:', error || 'No error')
        console.log('State:', state || 'No state')

        if (error) {
            return NextResponse.json({
                error: 'OAuth error from Google',
                details: error,
                code: code,
                state: state
            }, { status: 400 })
        }

        if (!code) {
            return NextResponse.json({
                error: 'No authorization code received',
                url: request.url,
                searchParams: Object.fromEntries(url.searchParams)
            }, { status: 400 })
        }

        // Test token exchange
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://www.energylogic-ai.com/api/auth/oauth/google/callback'

        console.log('🔍 Token exchange test:')
        console.log('Client ID:', clientId ? clientId.substring(0, 20) + '...' : 'Not set')
        console.log('Client Secret:', clientSecret ? clientSecret.substring(0, 10) + '...' : 'Not set')
        console.log('Redirect URI:', redirectUri)

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
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
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                    code: code.substring(0, 20) + '...'
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
        console.error('Debug OAuth callback error:', error)
        return NextResponse.json({ 
            error: 'Debug failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
