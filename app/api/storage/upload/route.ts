import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const path = formData.get('path') as string
        const bucket = formData.get('bucket') as string || 'course-materials'

        if (!file || !path) {
            return NextResponse.json(
                { error: 'File and path are required' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                upsert: true,
                contentType: file.type
            })

        if (error) {
            console.error('Storage upload error:', error)
            return NextResponse.json(
                { error: 'File upload failed', details: error.message },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)

        return NextResponse.json({
            success: true,
            path: data.path,
            url: urlData.publicUrl,
            message: 'File uploaded successfully'
        })

    } catch (error) {
        console.error('Upload API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
