import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.NEXT_PUBLIC_JWT_REFRESH_SECRET

// JWT secrets are checked at runtime when generating tokens

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export interface RefreshPayload {
  userId: string
  type: 'refresh'
  iat?: number
  exp?: number
}

/**
 * Generate JWT access token (short-lived, 15 minutes)
 */
export function generateJWT(userId: string, email: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }
  
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '15m' }
  )
}

/**
 * Generate refresh token (long-lived, 7 days)
 */
export function generateRefreshToken(userId: string): string {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured')
  }
  
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
}

/**
 * Verify and decode JWT access token
 */
export function verifyJWT(token: string): JWTPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }
  
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): RefreshPayload {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured')
  }
  
  return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshPayload
}

