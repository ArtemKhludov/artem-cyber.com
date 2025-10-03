import type { NextRequest } from 'next/server'

const DEFAULT_ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined,
].filter(Boolean) as string[]

const ORIGIN_CACHE = new Set<string>()
DEFAULT_ALLOWED_ORIGINS.forEach(origin => ORIGIN_CACHE.add(normalizeOrigin(origin)))
registerAllowedOrigins(process.env.CSRF_ALLOWED_ORIGINS)

function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return url.origin
  } catch {
    return origin
  }
}

export class CsrfError extends Error {
  constructor(message = 'Недопустимый источник запроса') {
    super(message)
    this.name = 'CsrfError'
  }
}

export function getAllowedOrigins() {
  return Array.from(ORIGIN_CACHE)
}

export function registerAllowedOrigins(origins: string | string[] | undefined) {
  if (!origins) return
  const values = Array.isArray(origins) ? origins : origins.split(',')
  values
    .map(value => value.trim())
    .filter(Boolean)
    .forEach(value => ORIGIN_CACHE.add(normalizeOrigin(value)))
}

export function verifyRequestOrigin(request: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return
  }

  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')
  const allowedOrigins = getAllowedOrigins()

  if (originHeader) {
    const origin = normalizeOrigin(originHeader)
    if (!allowedOrigins.includes(origin)) {
      throw new CsrfError()
    }
    return
  }

  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin
      if (!allowedOrigins.includes(refererOrigin)) {
        throw new CsrfError()
      }
      return
    } catch {
      throw new CsrfError()
    }
  }

  // без origin/referer считаем запрос подозрительным
  throw new CsrfError()
}

// Умная проверка origin для специальных случаев
export function verifyRequestOriginSmart(request: NextRequest, options: {
  allowOAuth?: boolean
  allowSessionPing?: boolean
  allowSameDomain?: boolean
} = {}) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return
  }

  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')
  const allowedOrigins = getAllowedOrigins()
  const currentHost = request.headers.get('host')

  // Проверяем origin
  if (originHeader) {
    const origin = normalizeOrigin(originHeader)

    // Разрешаем OAuth запросы от Google
    if (options.allowOAuth && origin === 'https://accounts.google.com') {
      return
    }

    // Разрешаем запросы от того же домена
    if (options.allowSameDomain && currentHost) {
      const currentOrigin = `https://${currentHost}`
      if (origin === currentOrigin) {
        return
      }
    }

    // Стандартная проверка
    if (!allowedOrigins.includes(origin)) {
      throw new CsrfError()
    }
    return
  }

  // Проверяем referer
  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin

      // Разрешаем OAuth запросы от Google
      if (options.allowOAuth && refererOrigin === 'https://accounts.google.com') {
        return
      }

      // Разрешаем запросы от того же домена
      if (options.allowSameDomain && currentHost) {
        const currentOrigin = `https://${currentHost}`
        if (refererOrigin === currentOrigin) {
          return
        }
      }

      // Стандартная проверка
      if (!allowedOrigins.includes(refererOrigin)) {
        throw new CsrfError()
      }
      return
    } catch {
      throw new CsrfError()
    }
  }

  // Для session ping без origin/referer - разрешаем если это запрос от того же домена
  if (options.allowSessionPing && currentHost) {
    const userAgent = request.headers.get('user-agent')
    // Проверяем, что это не подозрительный запрос
    if (userAgent && !userAgent.includes('bot') && !userAgent.includes('crawler')) {
      return
    }
  }

  // без origin/referer считаем запрос подозрительным
  throw new CsrfError()
}

export function getClientIp(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return undefined
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get('user-agent') ?? undefined
}

interface RecaptchaVerificationResult {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  [key: string]: unknown
}

export async function verifyRecaptchaToken(token: string | undefined, remoteIp?: string) {
  if (!token) return false

  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    console.warn('RECAPTCHA_SECRET_KEY is not set; skipping verification')
    return true
  }

  try {
    const body = new URLSearchParams()
    body.append('secret', secret)
    body.append('response', token)
    if (remoteIp) {
      body.append('remoteip', remoteIp)
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      console.error('reCAPTCHA verify failed with status', response.status)
      return false
    }

    const data = (await response.json()) as RecaptchaVerificationResult
    if (!data.success) {
      console.warn('reCAPTCHA verification rejected', data)
      return false
    }

    const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.4')
    if (typeof data.score === 'number' && data.score < minScore) {
      console.warn('reCAPTCHA score below threshold', { score: data.score, minScore })
      return false
    }

    return true
  } catch (error) {
    console.error('reCAPTCHA verification error', error)
    return false
  }
}
