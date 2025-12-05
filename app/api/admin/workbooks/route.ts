import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Workbook } from '@/types'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - get all workbooks for a course
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

        const { data: workbooks, error } = await supabase
            .from('course_workbooks')
            .select('*')
            .eq('document_id', documentId)
            .eq('is_active', true)
            .order('order_index', { ascending: true })

        if (error) {
            console.error('Error fetching workbooks:', error)
            return NextResponse.json(
                { error: 'Failed to fetch workbooks' },
                { status: 500 }
            )
        }

        return NextResponse.json({ workbooks })

    } catch (error) {
        console.error('Error in GET /api/admin/workbooks:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST - create a new workbook
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { document_id, title, description, file_url, video_url, order_index } = body

        if (!document_id || !title) {
            return NextResponse.json(
                { error: 'Document ID and title are required' },
                { status: 400 }
            )
        }

        // If file_url is not specified, use a placeholder
        const finalFileUrl = file_url || 'https://placeholder.com/workbook.pdf'

        // Check that the document exists
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('id')
            .eq('id', document_id)
            .single()

        if (docError || !document) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            )
        }

        // If order_index is not specified, get the next available one
        let finalOrderIndex = order_index
        if (!finalOrderIndex) {
            const { data: maxOrder } = await supabase
                .from('course_workbooks')
                .select('order_index')
                .eq('document_id', document_id)
                .order('order_index', { ascending: false })
                .limit(1)
                .single()

            finalOrderIndex = (maxOrder?.order_index || 0) + 1
        }

        const { data: workbook, error } = await supabase
            .from('course_workbooks')
            .insert({
                document_id,
                title,
                description: description || null,
                file_url: finalFileUrl,
                video_url: video_url || null,
                order_index: finalOrderIndex,
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating workbook:', error)
            return NextResponse.json(
                { error: 'Failed to create workbook' },
                { status: 500 }
            )
        }

        return NextResponse.json({ workbook }, { status: 201 })

    } catch (error) {
        console.error('Error in POST /api/admin/workbooks:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT - update workbook
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, title, description, file_url, video_url, order_index, is_active } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Workbook ID is required' },
                { status: 400 }
            )
        }

        const updateData: any = {}
        if (title !== undefined) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (file_url !== undefined) updateData.file_url = file_url
        if (video_url !== undefined) updateData.video_url = video_url
        if (order_index !== undefined) updateData.order_index = order_index
        if (is_active !== undefined) updateData.is_active = is_active

        const { data: workbook, error } = await supabase
            .from('course_workbooks')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating workbook:', error)
            return NextResponse.json(
                { error: 'Failed to update workbook' },
                { status: 500 }
            )
        }

        return NextResponse.json({ workbook })

    } catch (error) {
        console.error('Error in PUT /api/admin/workbooks:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE - delete workbook
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Workbook ID is required' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('course_workbooks')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting workbook:', error)
            return NextResponse.json(
                { error: 'Failed to delete workbook' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error in DELETE /api/admin/workbooks:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
