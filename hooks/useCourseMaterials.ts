import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CourseMaterial {
    file_url?: string
    workbook_url?: string
    video_urls?: string[]
    audio_url?: string
    video_preview_url?: string
    cover_url?: string
}

export function useCourseMaterials(documentId: string, materials: CourseMaterial) {
    const [secureMaterials, setSecureMaterials] = useState<CourseMaterial>(materials)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getSecureUrl = async (filePath: string): Promise<string> => {
        try {
            const response = await fetch(
                `/api/materials/signed-url?path=${encodeURIComponent(filePath)}&documentId=${encodeURIComponent(documentId)}`,
                { credentials: 'include' }
            )

            if (!response.ok) {
                throw new Error('Access denied')
            }

            const data = await response.json()
            return data.url as string
        } catch (error) {
            console.error('Error getting secure URL:', error)
            throw error
        }
    }

    const loadSecureMaterials = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                // User not authorized - show only public materials
                setSecureMaterials({
                    cover_url: materials.cover_url,
                    video_preview_url: materials.video_preview_url,
                })
                return
            }

            // User authorized - load all materials
            const newMaterials: CourseMaterial = {
                cover_url: materials.cover_url,
                video_preview_url: materials.video_preview_url,
            }

            // Load private materials
            if (materials.file_url) {
                try {
                    const secureUrl = await getSecureUrl(materials.file_url.replace(/.*\/courses\//, 'courses/'))
                    newMaterials.file_url = secureUrl
                } catch (error) {
                    console.warn('Could not load main PDF:', error)
                }
            }

            if (materials.workbook_url) {
                try {
                    const secureUrl = await getSecureUrl(materials.workbook_url.replace(/.*\/courses\//, 'courses/'))
                    newMaterials.workbook_url = secureUrl
                } catch (error) {
                    console.warn('Could not load workbook:', error)
                }
            }

            if (materials.audio_url) {
                try {
                    const secureUrl = await getSecureUrl(materials.audio_url.replace(/.*\/courses\//, 'courses/'))
                    newMaterials.audio_url = secureUrl
                } catch (error) {
                    console.warn('Could not load audio:', error)
                }
            }

            if (materials.video_urls) {
                newMaterials.video_urls = []
                for (const videoUrl of materials.video_urls) {
                    try {
                        const secureUrl = await getSecureUrl(videoUrl.replace(/.*\/courses\//, 'courses/'))
                        newMaterials.video_urls.push(secureUrl)
                    } catch (error) {
                        console.warn('Could not load video:', error)
                    }
                }
            }

            setSecureMaterials(newMaterials)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSecureMaterials()
    }, [documentId])

    return {
        materials: secureMaterials,
        loading,
        error,
        refetch: loadSecureMaterials,
    }
}
