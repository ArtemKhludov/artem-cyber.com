import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

/**
 * Get current user profile (mobile-optimized)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  
  if (!auth.success) {
    return auth.response
  }

  return NextResponse.json({
    user: {
      id: auth.context.user.id,
      email: auth.context.user.email,
      name: auth.context.user.name,
      role: auth.context.user.role || 'user'
    }
  })
}

/**
 * Update user profile
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()
    const { name, phone } = body

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', auth.context.user.id)
      .select('id, email, name, phone, role')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

