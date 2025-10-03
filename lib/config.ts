/**
 * Универсальная конфигурация для работы на localhost и продакшне
 */

// Определяем базовый URL в зависимости от окружения
export function getBaseUrl(): string {
  // В браузере
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // На сервере
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
  
  // Локальная разработка
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  // Fallback для продакшна
  return 'https://www.energylogic-ai.com'
}

// Получаем URL для OAuth callback
export function getOAuthCallbackUrl(): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/api/auth/oauth/google/callback`
}

// Получаем URL для логина
export function getLoginUrl(): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/auth/login`
}

// Получаем URL для дашборда
export function getDashboardUrl(): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/dashboard`
}

// Проверяем, работаем ли мы локально
export function isLocalhost(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost'
  }
  
  return process.env.NODE_ENV === 'development'
}

// Получаем порт для локальной разработки
export function getLocalPort(): number {
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10)
  }
  
  return 3000
}

// Конфигурация для разных окружений
export const config = {
  // Базовые URL
  baseUrl: getBaseUrl(),
  oauthCallbackUrl: getOAuthCallbackUrl(),
  loginUrl: getLoginUrl(),
  dashboardUrl: getDashboardUrl(),
  
  // Окружение
  isLocalhost: isLocalhost(),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Порты
  localPort: getLocalPort(),
  
  // Google OAuth
  googleOAuth: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: getOAuthCallbackUrl()
  },
  
  // Email
  email: {
    fromEmail: process.env.NOTIFY_SENDER_EMAIL || 'noreply@energylogic-ai.com',
    fromName: process.env.NOTIFY_SENDER_NAME || 'EnergyLogic AI'
  }
}
