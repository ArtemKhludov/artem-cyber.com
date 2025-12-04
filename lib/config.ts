/**
 * Universal configuration for localhost and production
 */

// Determine base URL based on environment
export function getBaseUrl(): string {
  // In browser
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // On server
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  if (process.env.APP_URL) {
    return process.env.APP_URL
  }
  
  // Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Local development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  // Fallback for production
  return 'https://www.energylogic-ai.com'
}

// Get URL for OAuth callback
export function getOAuthCallbackUrl(): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/api/auth/oauth/google/callback`
}

// Get URL for login
export function getLoginUrl(): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/auth/login`
}

// Get URL for dashboard
export function getDashboardUrl(): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/dashboard`
}

// Check if we're running locally
export function isLocalhost(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost'
  }
  
  return process.env.NODE_ENV === 'development'
}

// Get port for local development
export function getLocalPort(): number {
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10)
  }
  
  return 3000
}

// Configuration for different environments
export const config = {
  // Base URLs
  baseUrl: getBaseUrl(),
  oauthCallbackUrl: getOAuthCallbackUrl(),
  loginUrl: getLoginUrl(),
  dashboardUrl: getDashboardUrl(),
  
  // Environment
  isLocalhost: isLocalhost(),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Ports
  localPort: getLocalPort(),
  
  // Google OAuth
  googleOAuth: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: getOAuthCallbackUrl()
  },
  
  // Email
  email: {
    fromEmail: process.env.NOTIFY_SENDER_EMAIL || 'no-reply@energylogic-ai.com',
    fromName: process.env.NOTIFY_SENDER_NAME || 'EnergyLogic AI'
  }
}
