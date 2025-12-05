'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import {
    Play,
    Download,
    FileText,
    Video,
    Volume2,
    ArrowLeft,
    Clock,
    CheckCircle,
    Lock,
    Star,
    Trophy,
    TrendingUp,
    Award,
    Zap
} from 'lucide-react'
import Link from 'next/link'
import type { Document, Workbook, CourseVideo, CourseAudio } from '@/types'
import { initPostHog } from '@/lib/posthog'
import { appendRecentActivity } from '@/lib/recent-activity'
import ReportIssueDialog, { type IssueContext } from '@/components/dashboard/ReportIssueDialog'
import SmartMaterialPreview, { type PreviewItem } from '@/components/courses/SmartMaterialPreview'

interface MaterialLink {
    url: string
    expiresIn: number
    expiresAt: number
}

const STORAGE_OBJECT_PREFIX = '/storage/v1/object/'

const normalizeStoragePath = (raw: string | null | undefined): string | null => {
    if (!raw) return null
    let value = raw.trim()

    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value)
            const prefixIndex = parsed.pathname.indexOf(STORAGE_OBJECT_PREFIX)
            if (prefixIndex >= 0) {
                value = parsed.pathname.slice(prefixIndex + STORAGE_OBJECT_PREFIX.length)
                const queryIndex = value.indexOf('?')
                if (queryIndex >= 0) {
                    value = value.slice(0, queryIndex)
                }
            } else {
                return null
            }
        } catch (error) {
            console.warn('Failed to parse material URL', error)
            return null
        }
    }

    value = value.replace(/^sign\//, '')
    value = value.replace(/^public\//, '')
    value = value.replace(/^course-materials\//, '')

    return value.replace(/^\/+/, '')
}

const formatDurationSeconds = (totalSeconds: number): string => {
    if (totalSeconds <= 0) {
        return 'less than 1 sec'
    }

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes >= 1) {
        const secondsPart = seconds > 0 ? ` ${seconds} sec` : ''
        return `${minutes} min${secondsPart}`
    }

    return `${seconds} sec`
}

interface CourseProgress {
    user_email: string
    course_id: string
    material_type: string
    material_id: string
    material_title: string
    status: 'not_started' | 'in_progress' | 'completed'
    progress_percentage: number
    time_spent: number
    completed_at: string | null
}

interface CourseStats {
    total_materials: number
    completed_materials: number
    completion_percentage: number
    total_time_spent: number
}

interface UserPoints {
    total_points: number
    current_level: number
    points_to_next_level: number
    streak_days: number
}

interface Achievement {
    id: string
    achievement_type: string
    achievement_title: string
    achievement_description: string
    points_awarded: number
    icon: string
    earned_at: string
}

export default function CoursePlayer() {
    const params = useParams()
    const courseId = params.id as string
    const router = useRouter()

    const [course, setCourse] = useState<Document | null>(null)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeVideo, setActiveVideo] = useState<string | null>(null)
    const [activeAudio, setActiveAudio] = useState<string | null>(null)
    const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([])
    const [courseStats, setCourseStats] = useState<CourseStats | null>(null)
    const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
    const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([])
    const [showAchievement, setShowAchievement] = useState<Achievement | null>(null)
    const [updatingProgress, setUpdatingProgress] = useState<string | null>(null)
    const [materialLinks, setMaterialLinks] = useState<Record<string, MaterialLink>>({})
    const [linkLoading, setLinkLoading] = useState<Record<string, boolean>>({})
    const [linkErrors, setLinkErrors] = useState<Record<string, string>>({})
    const [now, setNow] = useState(Date.now())
    const hasMaterialLinks = Object.keys(materialLinks).length > 0
    const [issueDialogOpen, setIssueDialogOpen] = useState(false)
    const [issueContext, setIssueContext] = useState<IssueContext | null>(null)
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null)
    const track = useCallback((event: string, props?: Record<string, unknown>) => {
        const ph = initPostHog()
        ph?.capture(event, props)
    }, [])

    const logUserActivity = useCallback(async (payload: {
        action: string
        materialKey: string
        materialId?: string | number
        materialType?: string
        materialTitle?: string
        targetId?: string
        metadata?: Record<string, unknown>
    }) => {
        try {
            await fetch('/api/user/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: payload.action,
                    targetId: payload.targetId ?? String(payload.materialId ?? ''),
                    targetTable: 'course_materials',
                    metadata: {
                        courseId,
                        courseTitle: course?.title,
                        materialKey: payload.materialKey,
                        materialId: payload.materialId,
                        materialType: payload.materialType,
                        materialTitle: payload.materialTitle,
                        ...payload.metadata
                    }
                })
            })
        } catch (error) {
            console.warn('Failed to save activity', error)
        }
    }, [course?.title, courseId])

    const recordLocalActivity = useCallback((entry: {
        materialKey: string
        materialId?: string | number
        materialType: string
        materialTitle: string
        action: 'view' | 'download'
    }) => {
        const occurredAt = new Date().toISOString()
        const materialId = entry.materialId ? String(entry.materialId) : undefined
        appendRecentActivity({
            id: `${entry.materialKey}-${entry.action}-${occurredAt}`,
            courseId,
            courseTitle: course?.title,
            materialKey: entry.materialKey,
            materialId,
            materialType: entry.materialType,
            materialTitle: entry.materialTitle,
            action: entry.action,
            url: `/courses/${courseId}/player`,
            occurredAt,
            source: 'local'
        })
    }, [course?.title, courseId])

    const openIssueDialog = useCallback((issue: IssueContext) => {
        setIssueContext(issue)
        setIssueDialogOpen(true)
        track('course_issue_dialog_open', {
            courseId,
            materialId: issue.materialId,
            materialType: issue.materialType
        })
    }, [courseId, track])

    useEffect(() => {
        if (!hasMaterialLinks) return
        const timer = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(timer)
    }, [hasMaterialLinks])

    // Load course progress
    const loadCourseProgress = useCallback(async () => {
        try {
            const response = await fetch(`/api/progress?courseId=${courseId}`, {
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                setCourseProgress(data.courseProgress || [])
                setCourseStats(data.courseStats)
                setUserPoints(data.userPoints)
                setRecentAchievements(data.newAchievements || [])

                // Show the latest achievement
                if (data.newAchievements && data.newAchievements.length > 0) {
                    setShowAchievement(data.newAchievements[0])
                }
            }
        } catch (error) {
            console.error('Failed to load progress:', error)
        }
    }, [courseId])

    useEffect(() => {
        const checkAccess = async () => {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(`/api/courses/${courseId}/access`, {
                    credentials: 'include'
                })

                if (!response.ok) {
                    let errorData: { error?: string } | null = null
                    try {
                        errorData = await response.json()
                    } catch (jsonError) {
                        console.warn('Failed to parse course access response', jsonError)
                    }

                    if (response.status === 401) {
                        setError('Authorization required')
                        const redirectTarget = encodeURIComponent(`/courses/${courseId}/player`)
                        router.replace(`/auth/login?redirect=${redirectTarget}`)
                    } else if (response.status === 403) {
                        setError(errorData?.error || 'Course not purchased')
                    } else if (response.status === 404) {
                        setError('Course not found')
                        router.replace(`/courses/${courseId}`)
                    } else {
                        setError(errorData?.error || 'Failed to load course')
                    }
                    return
                }

                const data = await response.json()
                setCourse(data.course)
                setUser(data.user)

                // Load course progress
                await loadCourseProgress()

            } catch (err) {
                console.error('Error checking course access:', err)
                setError('Failed to load course')
            } finally {
                setLoading(false)
            }
        }

        if (courseId) {
            checkAccess()
        }
    }, [courseId, loadCourseProgress])

    // Update material progress
    const updateMaterialProgress = async (
        materialId: string,
        materialType: string,
        materialTitle: string,
        status: 'not_started' | 'in_progress' | 'completed',
        progressPercentage: number = 100,
        timeSpent: number = 0
    ) => {
        const progressKey = `${materialType}_${materialId}`
        setUpdatingProgress(progressKey)

        try {
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    courseId,
                    materialType,
                    materialId,
                    materialTitle,
                    status,
                    progressPercentage,
                    timeSpent
                })
            })

            if (response.ok) {
                const data = await response.json()

                // Update local state
                setCourseStats(data.stats)
                setUserPoints(data.userPoints)

                // Show a new achievement
                if (data.newAchievements && data.newAchievements.length > 0) {
                    setShowAchievement(data.newAchievements[0])
                }

                // Refresh progress
                await loadCourseProgress()
            } else {
                console.error('Error updating progress:', await response.text())
            }
        } catch (error) {
            console.error('Error updating progress:', error)
        } finally {
            setUpdatingProgress(null)
        }
    }

    // Determine material status
    const getMaterialKey = (materialType: string, materialId: string | number) => `${materialType}_${materialId}`

    const ensureSignedLink = useCallback(async (
        { key, path, expiresIn }: { key: string; path: string; expiresIn?: number }
    ): Promise<MaterialLink> => {
        const existing = materialLinks[key]
        const nowTs = Date.now()
        if (existing && existing.expiresAt - nowTs > 5000) {
            return existing
        }

        setLinkLoading((prev) => ({ ...prev, [key]: true }))
        try {
            const params = new URLSearchParams({
                documentId: courseId,
                path
            })

            if (expiresIn) {
                params.set('expiresIn', String(expiresIn))
            }

            const response = await fetch(`/api/materials/signed-url?${params.toString()}`, {
                credentials: 'include'
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Could not get a link')
            }

            const data = await response.json()
            const linkInfo: MaterialLink = {
                url: data.url,
                expiresIn: data.expiresIn,
                expiresAt: Date.now() + data.expiresIn * 1000
            }

            setMaterialLinks((prev) => ({ ...prev, [key]: linkInfo }))
            setLinkErrors((prev) => {
                const next = { ...prev }
                delete next[key]
                return next
            })

            track('signed_url_issued', { courseId, key, path, expiresIn: data.expiresIn })
            return linkInfo
        } catch (error) {
            console.error('Failed to obtain signed link', error)
            setLinkErrors((prev) => ({
                ...prev,
                [key]: error instanceof Error ? error.message : 'Unknown error'
            }))
            try { track('signed_url_error', { courseId, key, path, message: error instanceof Error ? error.message : String(error) }) } catch { }
            throw error
        } finally {
            setLinkLoading((prev) => {
                const { [key]: _removed, ...rest } = prev
                return rest
            })
        }
    }, [courseId, materialLinks])

    const renderLinkStatus = (key: string) => {
        if (linkLoading[key]) {
            return (
                <p className="text-xs text-gray-500 mt-2" role="status">
                    Preparing a protected link...
                </p>
            )
        }

        const errorMessage = linkErrors[key]
        if (errorMessage) {
            return (
                <p className="text-xs text-red-500 mt-2" role="alert">
                    {errorMessage}
                </p>
            )
        }

        const info = materialLinks[key]
        if (info) {
            const remainingSeconds = Math.max(0, Math.floor((info.expiresAt - now) / 1000))
            return (
                <p className="text-xs text-gray-500 mt-2">
                    Link expires in {formatDurationSeconds(remainingSeconds)}
                </p>
            )
        }

        return null
    }

    const getMaterialStatus = (materialId: string, materialType: string): 'not_started' | 'in_progress' | 'completed' => {
        const progress = courseProgress.find(p =>
            p.material_id === materialId && p.material_type === materialType
        )
        return progress?.status || 'not_started'
    }

    // Check if material is completed
    const isMaterialCompleted = (materialId: string, materialType: string): boolean => {
        return getMaterialStatus(materialId, materialType) === 'completed'
    }

    const handleDownload = async (
        materialKey: string,
        fileUrl: string,
        filename: string,
        options?: {
            materialId?: string | number
            materialType?: string
            materialTitle?: string
        }
    ) => {
        if (!fileUrl) {
            console.warn('Attempt to download material without a link', materialKey)
            return
        }

        try {
            track('material_download_click', { courseId, materialKey })
            let targetUrl = fileUrl
            const normalizedPath = normalizeStoragePath(fileUrl)

            if (normalizedPath) {
                const link = await ensureSignedLink({ key: materialKey, path: normalizedPath })
                targetUrl = link.url
            }

            const linkElement = document.createElement('a')
            linkElement.href = targetUrl
            linkElement.download = filename
            linkElement.target = '_blank'
            document.body.appendChild(linkElement)
            linkElement.click()
            document.body.removeChild(linkElement)
            track('material_download_success', { courseId, materialKey })
            recordLocalActivity({
                materialKey,
                materialId: options?.materialId,
                materialType: options?.materialType ?? 'resource',
                materialTitle: options?.materialTitle ?? filename,
                action: 'download'
            })
            void logUserActivity({
                action: 'course_material_download',
                materialKey,
                materialId: options?.materialId,
                materialType: options?.materialType ?? 'resource',
                materialTitle: options?.materialTitle ?? filename,
                metadata: {
                    filename,
                    downloadUrl: targetUrl.includes('token=') ? 'signed' : 'direct'
                }
            })
        } catch (error) {
            console.error('Could not download material', error)
            try { track('material_download_failed', { courseId, materialKey }) } catch { }
        }
    }

    const handleOpenVideo = async (video: CourseVideo) => {
        if (!video?.file_url) {
            console.warn('Video without file_url', video?.id)
            return
        }

        const videoKey = getMaterialKey('video', video.id)

        try {
            track('material_video_play_click', { courseId, materialKey: videoKey })
            let streamUrl = video.file_url
            const normalizedPath = normalizeStoragePath(video.file_url)
            let expiresAt: number | undefined

            if (normalizedPath) {
                const link = await ensureSignedLink({ key: videoKey, path: normalizedPath })
                streamUrl = link.url
                expiresAt = link.expiresAt
            }

            setActiveVideo(streamUrl)
            void updateMaterialProgress(
                video.id,
                'video',
                video.title,
                'completed',
                100,
                1800
            )
            track('material_video_play_success', { courseId, materialKey: videoKey })
            recordLocalActivity({
                materialKey: videoKey,
                materialId: video.id,
                materialType: 'video',
                materialTitle: video.title,
                action: 'view'
            })
            setPreviewItem({
                kind: 'video',
                title: video.title,
                subtitle: video.description || undefined,
                url: streamUrl,
                expiresAt,
                description: video.description || undefined
            })
            void logUserActivity({
                action: 'course_material_view',
                materialKey: videoKey,
                materialId: video.id,
                materialType: 'video',
                materialTitle: video.title,
                metadata: {
                    streamUrl: streamUrl.includes('token=') ? 'signed' : 'direct',
                    expiresAt
                }
            })
        } catch (error) {
            console.error('Could not open video', error)
            try { track('material_video_play_failed', { courseId, materialKey: videoKey }) } catch { }
        }
    }

    const handlePlayAudio = async (audioItem: CourseAudio) => {
        if (!audioItem?.file_url) {
            console.warn('Audio without file_url', audioItem?.id)
            return
        }

        const audioKey = getMaterialKey('audio', audioItem.id)

        try {
            track('material_audio_play_click', { courseId, materialKey: audioKey })
            let streamUrl = audioItem.file_url
            const normalizedPath = normalizeStoragePath(audioItem.file_url)
            let expiresAt: number | undefined

            if (normalizedPath) {
                const link = await ensureSignedLink({ key: audioKey, path: normalizedPath })
                streamUrl = link.url
                expiresAt = link.expiresAt
            }

            setActiveAudio(streamUrl)
            void updateMaterialProgress(
                audioItem.id,
                'audio',
                audioItem.title,
                'completed',
                100,
                1200
            )
            track('material_audio_play_success', { courseId, materialKey: audioKey })
            recordLocalActivity({
                materialKey: audioKey,
                materialId: audioItem.id,
                materialType: 'audio',
                materialTitle: audioItem.title,
                action: 'view'
            })
            setPreviewItem({
                kind: 'audio',
                title: audioItem.title,
                subtitle: audioItem.description || undefined,
                url: streamUrl,
                expiresAt,
                description: audioItem.description || undefined
            })
            void logUserActivity({
                action: 'course_material_view',
                materialKey: audioKey,
                materialId: audioItem.id,
                materialType: 'audio',
                materialTitle: audioItem.title,
                metadata: {
                    streamUrl: streamUrl.includes('token=') ? 'signed' : 'direct',
                    expiresAt
                }
            })
        } catch (error) {
            console.error('Could not play audio', error)
            try { track('material_audio_play_failed', { courseId, materialKey: audioKey }) } catch { }
        }
    }

    const handlePreviewPdf = async (params: {
        materialKey: string
        fileUrl?: string | null
        title: string
        subtitle?: string
        materialId?: string | number
        materialType: string
        description?: string
    }) => {
        if (!params.fileUrl) {
            console.warn('PDF without file_url', params.materialKey)
            return
        }

        track('material_pdf_preview_click', { courseId, materialKey: params.materialKey })

        let previewUrl = params.fileUrl
        let expiresAt: number | undefined
        const normalizedPath = normalizeStoragePath(params.fileUrl)

        try {
            if (normalizedPath) {
                const link = await ensureSignedLink({ key: params.materialKey, path: normalizedPath })
                previewUrl = link.url
                expiresAt = link.expiresAt
            }

            setPreviewItem({
                kind: 'pdf',
                title: params.title,
                subtitle: params.subtitle,
                url: previewUrl,
                expiresAt,
                description: params.description
            })
            track('material_pdf_preview_success', { courseId, materialKey: params.materialKey })

            recordLocalActivity({
                materialKey: params.materialKey,
                materialId: params.materialId,
                materialType: params.materialType,
                materialTitle: params.title,
                action: 'view'
            })

            void logUserActivity({
                action: 'course_material_view',
                materialKey: params.materialKey,
                materialId: params.materialId,
                materialType: params.materialType,
                materialTitle: params.title,
                metadata: {
                    previewUrl: previewUrl.includes('token=') ? 'signed' : 'direct',
                    expiresAt
                }
            })
        } catch (error) {
            console.error('Could not open PDF preview', error)
            track('material_pdf_preview_failed', { courseId, materialKey: params.materialKey })
        }
    }

    const getTotalItems = (): number => {
        return courseStats?.total_materials || 0
    }

    const getCompletedItems = (): number => {
        return courseStats?.completed_materials || 0
    }

    const getCompletionPercentage = (): number => {
        return courseStats?.completion_percentage || 0
    }

    const getTotalStudyTime = (): string => {
        const totalSeconds = courseStats?.total_time_spent || 0
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)

        if (hours > 0) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m`
    }

    if (loading) {
        return (
            <PageLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
            </PageLayout>
        )
    }

    if (error || !course) {
        return (
            <PageLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Access restricted
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {error || 'Course not found'}
                        </p>
                        <div className="space-x-4">
                            <Button asChild>
                                <Link href="/catalog">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to catalog
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/catalog">
                                    Browse other courses
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </PageLayout>
        )
    }

    const mainPdfKey = getMaterialKey('main_pdf', courseId)

    return (
        <PageLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
                {/* Header */}
                <div className="bg-white shadow-sm border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Button asChild variant="ghost" className="mb-4">
                                    <Link href={`/courses/${courseId}`}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to overview
                                    </Link>
                                </Button>
                                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                                <p className="text-gray-600 mt-2">{course.description}</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <Clock className="w-4 h-4" />
                                    <span>Purchased: {course.purchase_date ? new Date(course.purchase_date).toLocaleDateString('en-US') : 'Unknown'}</span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    Progress: {getCompletedItems()} of {getTotalItems()} items ({getCompletionPercentage()}%)
                                </div>
                                {userPoints && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Star className="w-4 h-4 text-yellow-500" />
                                        <span className="text-yellow-600 font-medium">{userPoints.total_points} points</span>
                                        <span className="text-gray-500">• Level {userPoints.current_level}</span>
                                    </div>
                                )}
                                <div className="mt-3 flex justify-end">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openIssueDialog({
                                            subject: `Issue with course: ${course.title}`,
                                            courseId,
                                            courseTitle: course.title,
                                            issueType: 'content',
                                            issueSeverity: 'normal'
                                        })}
                                    >
                                        Report an issue
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 space-y-6">
                    <SmartMaterialPreview item={previewItem} onClose={() => setPreviewItem(null)} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Primary content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Main PDF */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-xl font-semibold text-gray-900">Main material</h2>
                                    {isMaterialCompleted(courseId, 'main_pdf') && (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    )}
                                </div>
                                <p className="text-gray-600 mb-4">
                                    {course.main_pdf_description || 'Primary course PDF'}
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => {
                                            void handleDownload(mainPdfKey, course.file_url, `${course.title}.pdf`, {
                                                materialId: courseId,
                                                materialType: 'main_pdf',
                                                materialTitle: `${course.title} - Main PDF`
                                            })
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={linkLoading[mainPdfKey]}
                                    >
                                        {linkLoading[mainPdfKey] ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Preparing...
                                            </div>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                Download PDF
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            void handlePreviewPdf({
                                                materialKey: mainPdfKey,
                                                fileUrl: course.file_url,
                                                title: `${course.title} - Main PDF`,
                                                materialId: courseId,
                                                materialType: 'main_pdf',
                                                description: course.main_pdf_description || undefined
                                            })
                                        }}
                                        size="sm"
                                        variant="ghost"
                                    >
                                        Preview
                                    </Button>
                                    <Button
                                        onClick={() => updateMaterialProgress(
                                            courseId,
                                            'main_pdf',
                                            `${course.title} - Main PDF`,
                                            isMaterialCompleted(courseId, 'main_pdf') ? 'not_started' : 'completed',
                                            100,
                                            0
                                        )}
                                        variant="outline"
                                        disabled={updatingProgress === `main_pdf_${courseId}`}
                                        className={isMaterialCompleted(courseId, 'main_pdf') ? 'bg-green-50 border-green-200 text-green-700' : ''}
                                    >
                                        {updatingProgress === `main_pdf_${courseId}` ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                Saving...
                                            </div>
                                        ) : (
                                            <>
                                                {isMaterialCompleted(courseId, 'main_pdf') ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                                        Completed
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-4 h-4 mr-2" />
                                                        Mark as completed
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {renderLinkStatus(mainPdfKey)}
                            </div>

                            {/* Workbooks */}
                            {course.has_workbook && course.workbooks && course.workbooks.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <FileText className="w-6 h-6 text-green-600" />
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Workbooks ({course.workbook_count})
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        {course.workbooks.map((workbook: Workbook) => {
                                            const workbookKey = getMaterialKey('workbook', workbook.id)
                                            return (
                                                <div key={workbook.id} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h3 className="font-medium text-gray-900">{workbook.title}</h3>
                                                                {isMaterialCompleted(workbook.id, 'workbook') && (
                                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                                )}
                                                            </div>
                                                            {workbook.description && (
                                                                <p className="text-sm text-gray-600 mb-3">{workbook.description}</p>
                                                            )}
                                                        </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => {
                                                                void handleDownload(workbookKey, workbook.file_url, `${workbook.title}.pdf`, {
                                                                    materialId: workbook.id,
                                                                    materialType: 'workbook',
                                                                    materialTitle: workbook.title
                                                                })
                                                            }}
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            disabled={linkLoading[workbookKey]}
                                                        >
                                                            {linkLoading[workbookKey] ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                    Preparing...
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Download className="w-4 h-4 mr-1" />
                                                                    Download
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                void handlePreviewPdf({
                                                                    materialKey: workbookKey,
                                                                    fileUrl: workbook.file_url,
                                                                    title: workbook.title,
                                                                    subtitle: course.title,
                                                                    materialId: workbook.id,
                                                                    materialType: 'workbook',
                                                                    description: workbook.description || undefined
                                                                })
                                                            }}
                                                            size="sm"
                                                            variant="ghost"
                                                        >
                                                            Preview
                                                        </Button>
                                                        <Button
                                                            onClick={() => updateMaterialProgress(
                                                                workbook.id,
                                                                'workbook',
                                                                workbook.title,
                                                                isMaterialCompleted(workbook.id, 'workbook') ? 'not_started' : 'completed',
                                                                100,
                                                                0
                                                            )}
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={updatingProgress === `workbook_${workbook.id}`}
                                                            className={isMaterialCompleted(workbook.id, 'workbook') ? 'bg-green-50 border-green-200 text-green-700' : ''}
                                                        >
                                                            {updatingProgress === `workbook_${workbook.id}` ? (
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                            ) : isMaterialCompleted(workbook.id, 'workbook') ? (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                                                                    Completed
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap className="w-4 h-4 mr-1" />
                                                                    Completed
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={() => openIssueDialog({
                                                                subject: `Issue with workbook: ${workbook.title}`,
                                                                courseId,
                                                                courseTitle: course.title,
                                                                materialId: workbook.id,
                                                                materialTitle: workbook.title,
                                                                materialType: 'workbook',
                                                                url: workbook.file_url || undefined,
                                                                issueType: 'content',
                                                                issueSeverity: 'normal'
                                                            })}
                                                            size="sm"
                                                            variant="ghost"
                                                        >
                                                            Report an issue
                                                        </Button>
                                                    </div>
                                                        {renderLinkStatus(workbookKey)}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Video lessons */}
                            {course.has_videos && course.videos && course.videos.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Video className="w-6 h-6 text-purple-600" />
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Video lessons ({course.video_count})
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        {course.videos.map((video: CourseVideo) => {
                                            const videoKey = getMaterialKey('video', video.id)
                                            return (
                                            <div key={video.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-medium text-gray-900">{video.title}</h3>
                                                            {isMaterialCompleted(video.id, 'video') && (
                                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                            )}
                                                        </div>
                                                        {video.description && (
                                                            <p className="text-sm text-gray-600 mb-3">{video.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => { void handleOpenVideo(video) }}
                                                            size="sm"
                                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                                            disabled={linkLoading[videoKey]}
                                                        >
                                                            {linkLoading[videoKey] ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                    Please wait...
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Play className="w-4 h-4 mr-1" />
                                                                    Watch
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDownload(videoKey, video.file_url, `${video.title}.mp4`, {
                                                                materialId: video.id,
                                                                materialType: 'video',
                                                                materialTitle: video.title
                                                            })}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Download
                                                        </Button>
                                                        <Button
                                                            onClick={() => updateMaterialProgress(
                                                                video.id,
                                                                'video',
                                                                video.title,
                                                                isMaterialCompleted(video.id, 'video') ? 'not_started' : 'completed',
                                                                100,
                                                                1800
                                                            )}
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={updatingProgress === `video_${video.id}`}
                                                            className={isMaterialCompleted(video.id, 'video') ? 'bg-green-50 border-green-200 text-green-700' : ''}
                                                        >
                                                            {updatingProgress === `video_${video.id}` ? (
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                            ) : isMaterialCompleted(video.id, 'video') ? (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                                                                    Completed
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap className="w-4 h-4 mr-1" />
                                                                    Completed
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={() => openIssueDialog({
                                                                subject: `Issue with video: ${video.title}`,
                                                                courseId,
                                                                courseTitle: course.title,
                                                                materialId: video.id,
                                                                materialTitle: video.title,
                                                                materialType: 'video',
                                                                url: materialLinks[videoKey]?.url || video.file_url || undefined,
                                                                issueType: 'content',
                                                                issueSeverity: 'normal'
                                                            })}
                                                            size="sm"
                                                            variant="ghost"
                                                        >
                                                            Report an issue
                                                        </Button>
                                                    </div>
                                                    {renderLinkStatus(videoKey)}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            )}

                            {/* Audio tracks */}
                            {course.has_audio && course.audio && course.audio.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Volume2 className="w-6 h-6 text-orange-600" />
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Audio tracks ({course.audio_count})
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        {course.audio.map((audioItem: CourseAudio) => {
                                            const audioKey = getMaterialKey('audio', audioItem.id)
                                            return (
                                            <div key={audioItem.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-medium text-gray-900">{audioItem.title}</h3>
                                                            {isMaterialCompleted(audioItem.id, 'audio') && (
                                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                            )}
                                                        </div>
                                                        {audioItem.description && (
                                                            <p className="text-sm text-gray-600 mb-3">{audioItem.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => { void handlePlayAudio(audioItem) }}
                                                            size="sm"
                                                            className="bg-orange-600 hover:bg-orange-700 text-white"
                                                            disabled={linkLoading[audioKey]}
                                                        >
                                                            {linkLoading[audioKey] ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                    Please wait...
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Play className="w-4 h-4 mr-1" />
                                                                    Listen
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDownload(audioKey, audioItem.file_url, `${audioItem.title}.mp3`, {
                                                                materialId: audioItem.id,
                                                                materialType: 'audio',
                                                                materialTitle: audioItem.title
                                                            })}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Download
                                                        </Button>
                                                        <Button
                                                            onClick={() => updateMaterialProgress(
                                                                audioItem.id,
                                                                'audio',
                                                                audioItem.title,
                                                                isMaterialCompleted(audioItem.id, 'audio') ? 'not_started' : 'completed',
                                                                100,
                                                                1200
                                                            )}
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={updatingProgress === `audio_${audioItem.id}`}
                                                            className={isMaterialCompleted(audioItem.id, 'audio') ? 'bg-green-50 border-green-200 text-green-700' : ''}
                                                        >
                                                            {updatingProgress === `audio_${audioItem.id}` ? (
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                            ) : isMaterialCompleted(audioItem.id, 'audio') ? (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                                                                    Completed
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap className="w-4 h-4 mr-1" />
                                                                    Completed
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={() => openIssueDialog({
                                                                subject: `Issue with audio: ${audioItem.title}`,
                                                                courseId,
                                                                courseTitle: course.title,
                                                                materialId: audioItem.id,
                                                                materialTitle: audioItem.title,
                                                                materialType: 'audio',
                                                                url: materialLinks[audioKey]?.url || audioItem.file_url || undefined,
                                                                issueType: 'content',
                                                                issueSeverity: 'normal'
                                                            })}
                                                            size="sm"
                                                            variant="ghost"
                                                        >
                                                            Report an issue
                                                        </Button>
                                                    </div>
                                                    {renderLinkStatus(audioKey)}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Progress */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Course progress</h3>

                                {/* Progress bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Total progress</span>
                                        <span>{getCompletionPercentage()}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${getCompletionPercentage()}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <div className="text-lg font-bold text-blue-600">{getCompletedItems()}</div>
                                        <div className="text-xs text-blue-500">Completed</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <div className="text-lg font-bold text-green-600">{getTotalStudyTime()}</div>
                                        <div className="text-xs text-green-500">Study time</div>
                                    </div>
                                </div>

                                {/* Detailed progress */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span>Main material</span>
                                        <span className={isMaterialCompleted(courseId, 'main_pdf') ? 'text-green-500' : 'text-gray-400'}>
                                            {isMaterialCompleted(courseId, 'main_pdf') ? '✓' : '○'}
                                        </span>
                                    </div>
                                    {course.workbooks?.map((workbook: Workbook) => (
                                        <div key={workbook.id} className="flex justify-between text-sm">
                                            <span className="truncate">{workbook.title}</span>
                                            <span className={isMaterialCompleted(workbook.id, 'workbook') ? 'text-green-500' : 'text-gray-400'}>
                                                {isMaterialCompleted(workbook.id, 'workbook') ? '✓' : '○'}
                                            </span>
                                        </div>
                                    ))}
                                    {course.videos?.map((video: CourseVideo) => (
                                        <div key={video.id} className="flex justify-between text-sm">
                                            <span className="truncate">{video.title}</span>
                                            <span className={isMaterialCompleted(video.id, 'video') ? 'text-green-500' : 'text-gray-400'}>
                                                {isMaterialCompleted(video.id, 'video') ? '✓' : '○'}
                                            </span>
                                        </div>
                                    ))}
                                    {course.audio?.map((audioItem: CourseAudio) => (
                                        <div key={audioItem.id} className="flex justify-between text-sm">
                                            <span className="truncate">{audioItem.title}</span>
                                            <span className={isMaterialCompleted(audioItem.id, 'audio') ? 'text-green-500' : 'text-gray-400'}>
                                                {isMaterialCompleted(audioItem.id, 'audio') ? '✓' : '○'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Points and achievements */}
                            {userPoints && (
                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Star className="w-5 h-5 text-yellow-500" />
                                        Your points
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Total points:</span>
                                            <span className="font-bold text-yellow-600">{userPoints.total_points}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Level:</span>
                                            <span className="font-bold text-blue-600">{userPoints.current_level}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Streak days:</span>
                                            <span className="font-bold text-green-600">{userPoints.streak_days}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                            <div
                                                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                                                style={{ width: `${((userPoints.total_points % 100) / 100) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-center text-gray-500">
                                            To next level: {userPoints.points_to_next_level} points
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Course info */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Course info</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Duration:</span>
                                        <span className="font-medium">{course.course_duration_minutes || 25} min</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Videos:</span>
                                        <span className="font-medium">{course.video_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Workbooks:</span>
                                        <span className="font-medium">{course.workbook_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Audio:</span>
                                        <span className="font-medium">{course.audio_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video modal */}
                {activeVideo && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Video lesson</h3>
                                <Button
                                    onClick={() => setActiveVideo(null)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    ✕
                                </Button>
                            </div>
                            <video
                                src={activeVideo}
                                controls
                                className="w-full h-auto"
                                autoPlay
                            />
                        </div>
                    </div>
                )}

                {/* Audio modal */}
                {activeAudio && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Audio track</h3>
                                <Button
                                    onClick={() => setActiveAudio(null)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    ✕
                                </Button>
                            </div>
                            <audio
                                src={activeAudio}
                                controls
                                className="w-full"
                                autoPlay
                            />
                        </div>
                    </div>
                )}

                {/* Achievement notification */}
                {showAchievement && (
                    <div className="fixed top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl shadow-2xl p-6 max-w-sm z-50 animate-bounce">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="text-3xl">{showAchievement.icon}</div>
                            <div>
                                <h4 className="font-bold text-white text-lg">Achievement unlocked!</h4>
                                <p className="text-yellow-100 text-sm">+{showAchievement.points_awarded} points</p>
                            </div>
                            <Button
                                onClick={() => setShowAchievement(null)}
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 ml-auto"
                            >
                                ✕
                            </Button>
                        </div>
                        <div className="text-white">
                            <h5 className="font-semibold mb-1">{showAchievement.achievement_title}</h5>
                            <p className="text-sm text-yellow-100">{showAchievement.achievement_description}</p>
                        </div>
                    </div>
                )}
            </div>
            <ReportIssueDialog
                open={issueDialogOpen}
                onOpenChange={setIssueDialogOpen}
                context={issueContext}
                track={(event, payload) => track(event, payload)}
                onSubmitted={() => {
                    setTimeout(() => setIssueDialogOpen(false), 1200)
                }}
            />
        </PageLayout>
    )
}
