import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CourseVideo } from '@/types'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - retrieve all videos for a course
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const documentId = searchParams.get('documentId')

        if (!documentId) {
            return NextResponse.json(
                { error: 'Document ID is required' },
                { status: 400 }
            )
        }

        const { data: videos, error } = await supabase
            .from('course_videos')
            .select('*')
            .eq('document_id', documentId)
            .eq('is_active', true)
            .order('order_index', { ascending: true })

        if (error) {
            console.error('Error fetching videos:', error)
            return NextResponse.json(
                { error: 'Failed to fetch videos' },
                { status: 500 }
            )
        }

        return NextResponse.json({ videos })

    } catch (error) {
        console.error('Error in GET /api/admin/videos:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST - create a new video
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { document_id, title, description, file_url, order_index } = body

        if (!document_id || !title || !file_url) {
            return NextResponse.json(
                { error: 'Document ID, title and file URL are required' },
                { status: 400 }
            )
        }

        // Determine order if not specified
        let finalOrderIndex = order_index
        if (!finalOrderIndex) {
            const { data: maxOrder } = await supabase
                .from('course_videos')
                .select('order_index')
                .eq('document_id', document_id)
                .order('order_index', { ascending: false })
                .limit(1)
                .single()

            finalOrderIndex = (maxOrder?.order_index || 0) + 1
        }

        const { data: video, error } = await supabase
            .from('course_videos')
            .insert({
                document_id,
                title,
                description: description || null,
                file_url,
                order_index: finalOrderIndex,
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating video:', error)
            return NextResponse.json(
                { error: 'Failed to create video' },
                { status: 500 }
            )
        }

        return NextResponse.json({ video })

    } catch (error) {
        console.error('Error in POST /api/admin/videos:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - update video
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, title, description, file_url, order_index, is_active } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            )
        }

        const updateData: any = {}
        if (title !== undefined) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (file_url !== undefined) updateData.file_url = file_url
        if (order_index !== undefined) updateData.order_index = order_index
        if (is_active !== undefined) updateData.is_active = is_active

        const { data: video, error } = await supabase
            .from('course_videos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating video:', error)
            return NextResponse.json(
                { error: 'Failed to update video' },
                { status: 500 }
            )
        }

        if (!video) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ video })

    } catch (error) {
        console.error('Error in PUT /api/admin/videos:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE - delete video
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('course_videos')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting video:', error)
            return NextResponse.json(
                { error: 'Failed to delete video' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error in DELETE /api/admin/videos:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
