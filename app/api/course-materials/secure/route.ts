import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkCourseAccess } from '@/lib/course-auth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * API for getting signed URLs for course media files
 * URLs have limited lifetime for security
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const courseId = searchParams.get('course_id')
        const filePath = searchParams.get('file_path')
        const expiresIn = parseInt(searchParams.get('expires_in') || '3600') // Default 1 hour

        if (!courseId || !filePath) {
            return NextResponse.json({
                error: 'Parameters course_id and file_path are required'
            }, { status: 400 })
        }

        // Check course access
        const accessCheck = await checkCourseAccess(courseId)

        if (!accessCheck.hasAccess) {
            return NextResponse.json({
                error: accessCheck.error || 'Access denied'
            }, { status: 403 })
        }

        // Extract relative path from full Supabase Storage URL
        let relativePath = filePath
        if (filePath.includes('/storage/v1/object/private/course-materials-private/')) {
            relativePath = filePath.split('/storage/v1/object/private/course-materials-private/')[1]
        }

        // Check that file belongs to this course
        if (!relativePath.startsWith(`courses/`)) {
            return NextResponse.json({
                error: 'Invalid file path'
            }, { status: 403 })
        }

        // Check if file exists
        const { data: fileList, error: listError } = await supabase.storage
            .from('course-materials-private')
            .list(relativePath.split('/').slice(0, -1).join('/'), {
                search: relativePath.split('/').pop()
            })

        if (listError || !fileList || fileList.length === 0) {
            console.error('File not found:', relativePath)
            return NextResponse.json({
                error: 'File not found'
            }, { status: 404 })
        }

        // Create signed URL with limited lifetime
        const { data, error } = await supabase.storage
            .from('course-materials-private')
            .createSignedUrl(relativePath, expiresIn)

        if (error) {
            console.error('Error creating signed URL:', error)
            return NextResponse.json({
                error: 'Failed to create file link'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            signed_url: data.signedUrl,
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            file_path: relativePath
        })

    } catch (error) {
        console.error('Error in secure materials API:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}

/**
 * API for getting media file information without downloading
 */
export async function HEAD(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const courseId = searchParams.get('course_id')
        const filePath = searchParams.get('file_path')

        if (!courseId || !filePath) {
            return NextResponse.json({
                error: 'Parameters course_id and file_path are required'
            }, { status: 400 })
        }

        // Check course access
        const accessCheck = await checkCourseAccess(courseId)

        if (!accessCheck.hasAccess) {
            return NextResponse.json({
                error: accessCheck.error || 'Access denied'
            }, { status: 403 })
        }

        // Get file information
        const { data, error } = await supabase.storage
            .from('course-materials-private')
            .list(filePath.split('/').slice(0, -1).join('/'), {
                search: filePath.split('/').pop()
            })

        if (error || !data || data.length === 0) {
            return NextResponse.json({
                error: 'File not found'
            }, { status: 404 })
        }

        const fileInfo = data[0]

        return NextResponse.json({
            success: true,
            file_info: {
                name: fileInfo.name,
                size: fileInfo.metadata?.size,
                last_modified: fileInfo.updated_at,
                content_type: fileInfo.metadata?.mimetype
            }
        })

    } catch (error) {
        console.error('Error getting file info:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}
