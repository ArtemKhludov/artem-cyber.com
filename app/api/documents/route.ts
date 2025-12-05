import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        // Fetch documents from database
        const { data: dbDocuments, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching documents:', error)
            return NextResponse.json(
                { error: 'Failed to fetch documents' },
                { status: 500 }
            )
        }

        // Fetch workbooks, videos, and audio for each document
        const documentIds = dbDocuments?.map(doc => doc.id) || []
        let workbooksData: Record<string, any[]> = {}
        let videosData: Record<string, any[]> = {}
        let audioData: Record<string, any[]> = {}

        if (documentIds.length > 0) {
            // Fetch workbooks
            const { data: workbooks, error: workbooksError } = await supabase
                .from('course_workbooks')
                .select('*')
                .in('document_id', documentIds)
                .eq('is_active', true)
                .order('order_index', { ascending: true })

            if (!workbooksError && workbooks) {
                workbooksData = workbooks.reduce((acc, workbook) => {
                    if (!acc[workbook.document_id]) {
                        acc[workbook.document_id] = []
                    }
                    acc[workbook.document_id].push({
                        id: workbook.id,
                        title: workbook.title,
                        description: workbook.description,
                        file_url: workbook.file_url,
                        video_url: workbook.video_url,
                        order_index: workbook.order_index
                    })
                    return acc
                }, {})
            }

            // Fetch videos
            const { data: videos, error: videosError } = await supabase
                .from('course_videos')
                .select('*')
                .in('document_id', documentIds)
                .eq('is_active', true)
                .order('order_index', { ascending: true })

            if (!videosError && videos) {
                videosData = videos.reduce((acc, video) => {
                    if (!acc[video.document_id]) {
                        acc[video.document_id] = []
                    }
                    acc[video.document_id].push({
                        id: video.id,
                        title: video.title,
                        description: video.description,
                        file_url: video.file_url,
                        order_index: video.order_index
                    })
                    return acc
                }, {})
            }

            // Fetch audio
            const { data: audio, error: audioError } = await supabase
                .from('course_audio')
                .select('*')
                .in('document_id', documentIds)
                .eq('is_active', true)
                .order('order_index', { ascending: true })

            if (!audioError && audio) {
                audioData = audio.reduce((acc, audioItem) => {
                    if (!acc[audioItem.document_id]) {
                        acc[audioItem.document_id] = []
                    }
                    acc[audioItem.document_id].push({
                        id: audioItem.id,
                        title: audioItem.title,
                        description: audioItem.description,
                        file_url: audioItem.file_url,
                        order_index: audioItem.order_index
                    })
                    return acc
                }, {})
            }
        }

        // Merge DB data (prices managed via admin panel)
        const documentsWithPricing = (dbDocuments || []).map(dbDoc => {
            const workbooks = workbooksData[dbDoc.id] || []
            const videos = videosData[dbDoc.id] || []
            const audio = audioData[dbDoc.id] || []

            return {
                ...dbDoc,
                // Use prices from DB (admin-managed)
                price: dbDoc.price_rub || dbDoc.price,
                price_rub: dbDoc.price_rub || dbDoc.price,
                // Add workbook info
                workbook_count: workbooks.length,
                has_workbook: workbooks.length > 0,
                workbooks: workbooks,
                // Add video info
                video_count: videos.length,
                has_videos: videos.length > 0,
                videos: videos,
                // Add audio info
                audio_count: audio.length,
                has_audio: audio.length > 0,
                audio: audio
            }
        })

        return NextResponse.json({ data: documentsWithPricing })
    } catch (error) {
        console.error('Documents API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
