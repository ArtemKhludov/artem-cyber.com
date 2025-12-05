import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const path = searchParams.get('path')
        const bucket = searchParams.get('bucket') || 'course-materials'

        if (!path) {
            return NextResponse.json(
                { error: 'File path is required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Get public URL of the file
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)

        return NextResponse.json({
            success: true,
            url: data.publicUrl,
            path: path
        })

    } catch (error) {
        console.error('Storage URL API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
