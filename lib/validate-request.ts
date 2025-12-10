import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Request validation middleware using Zod schemas
 * Automatically validates request body and returns 400 on validation errors
 */
export function validateRequest<T extends z.ZodType>(
  schema: T,
  handler: (req: NextRequest, data: z.infer<T>) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const data = schema.parse(body)
      return handler(req, data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
      throw error
    }
  }
}

/**
 * Common validation schemas
 */
export const schemas = {
  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    remember: z.boolean().optional()
  }),
  
  register: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional()
  }),
  
  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  }),
  
  courseId: z.object({
    id: z.string().uuid('Invalid course ID')
  })
}

