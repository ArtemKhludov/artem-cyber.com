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
            console.warn('Не удалось распарсить URL материала', error)
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
        return 'менее 1 сек'
    }

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes >= 1) {
        const secondsPart = seconds > 0 ? ` ${seconds} сек` : ''
        return `${minutes} мин${secondsPart}`
    }

    return `${seconds} сек`
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
    const track = useCallback((event: string, props?: Record<string, unknown>) => {
        const ph = initPostHog()
        ph?.capture(event, props)
    }, [])

    useEffect(() => {
        if (!hasMaterialLinks) return
        const timer = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(timer)
    }, [hasMaterialLinks])

    // Функция для загрузки прогресса курса
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

                // Показываем новое достижение
                if (data.newAchievements && data.newAchievements.length > 0) {
                    setShowAchievement(data.newAchievements[0])
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки прогресса:', error)
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
                        console.warn('Не удалось разобрать ответ при проверке доступа к курсу', jsonError)
                    }

                    if (response.status === 401) {
                        setError('Необходима авторизация')
                        const redirectTarget = encodeURIComponent(`/courses/${courseId}/player`)
                        router.replace(`/auth/login?redirect=${redirectTarget}`)
                    } else if (response.status === 403) {
                        setError(errorData?.error || 'Курс не приобретен')
                    } else if (response.status === 404) {
                        setError('Курс не найден')
                        router.replace(`/courses/${courseId}`)
                    } else {
                        setError(errorData?.error || 'Ошибка загрузки курса')
                    }
                    return
                }

                const data = await response.json()
                setCourse(data.course)
                setUser(data.user)

                // Загружаем прогресс курса
                await loadCourseProgress()

            } catch (err) {
                console.error('Error checking course access:', err)
                setError('Ошибка загрузки курса')
            } finally {
                setLoading(false)
            }
        }

        if (courseId) {
            checkAccess()
        }
    }, [courseId, loadCourseProgress])

    // Функция для обновления прогресса материала
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

                // Обновляем локальное состояние
                setCourseStats(data.stats)
                setUserPoints(data.userPoints)

                // Показываем новое достижение
                if (data.newAchievements && data.newAchievements.length > 0) {
                    setShowAchievement(data.newAchievements[0])
                }

                // Перезагружаем прогресс
                await loadCourseProgress()
            } else {
                console.error('Ошибка обновления прогресса:', await response.text())
            }
        } catch (error) {
            console.error('Ошибка обновления прогресса:', error)
        } finally {
            setUpdatingProgress(null)
        }
    }

    // Функция для проверки статуса материала
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
                throw new Error(errorData.error || 'Не удалось получить ссылку')
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
            console.error('Ошибка получения защищенной ссылки', error)
            setLinkErrors((prev) => ({
                ...prev,
                [key]: error instanceof Error ? error.message : 'Неизвестная ошибка'
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
                    Готовим защищенную ссылку...
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
                    Ссылка истечёт через {formatDurationSeconds(remainingSeconds)}
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

    // Функция для проверки завершенности материала
    const isMaterialCompleted = (materialId: string, materialType: string): boolean => {
        return getMaterialStatus(materialId, materialType) === 'completed'
    }

    const handleDownload = async (materialKey: string, fileUrl: string, filename: string) => {
        if (!fileUrl) {
            console.warn('Попытка скачать материал без ссылки', materialKey)
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
        } catch (error) {
            console.error('Не удалось скачать материал', error)
            try { track('material_download_failed', { courseId, materialKey }) } catch { }
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
            return `${hours}ч ${minutes}м`
        }
        return `${minutes}м`
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
                            Доступ ограничен
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {error || 'Курс не найден'}
                        </p>
                        <div className="space-x-4">
                            <Button asChild>
                                <Link href="/catalog">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    К каталогу
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/catalog">
                                    Посмотреть другие курсы
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
                {/* Заголовок */}
                <div className="bg-white shadow-sm border-b">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Button asChild variant="ghost" className="mb-4">
                                    <Link href={`/courses/${courseId}`}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Назад к описанию
                                    </Link>
                                </Button>
                                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                                <p className="text-gray-600 mt-2">{course.description}</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <Clock className="w-4 h-4" />
                                    <span>Куплен: {course.purchase_date ? new Date(course.purchase_date).toLocaleDateString('ru-RU') : 'Неизвестно'}</span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    Прогресс: {getCompletedItems()} из {getTotalItems()} материалов ({getCompletionPercentage()}%)
                                </div>
                                {userPoints && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Star className="w-4 h-4 text-yellow-500" />
                                        <span className="text-yellow-600 font-medium">{userPoints.total_points} баллов</span>
                                        <span className="text-gray-500">• Уровень {userPoints.current_level}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Основной контент */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Основной PDF */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-xl font-semibold text-gray-900">Основной материал</h2>
                                    {isMaterialCompleted(courseId, 'main_pdf') && (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    )}
                                </div>
                                <p className="text-gray-600 mb-4">
                                    {course.main_pdf_description || 'Основной PDF-документ курса'}
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => {
                                            void handleDownload(mainPdfKey, course.file_url, `${course.title}.pdf`)
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={linkLoading[mainPdfKey]}
                                    >
                                        {linkLoading[mainPdfKey] ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Подготавливаем...
                                            </div>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                Скачать PDF
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => updateMaterialProgress(
                                            courseId,
                                            'main_pdf',
                                            `${course.title} - Основной PDF`,
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
                                                Сохранение...
                                            </div>
                                        ) : (
                                            <>
                                                {isMaterialCompleted(courseId, 'main_pdf') ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                                        Изучено
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-4 h-4 mr-2" />
                                                        Отметить как изученное
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {renderLinkStatus(mainPdfKey)}
                            </div>

                            {/* Рабочие тетради */}
                            {course.has_workbook && course.workbooks && course.workbooks.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <FileText className="w-6 h-6 text-green-600" />
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Рабочие тетради ({course.workbook_count})
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
                                                                    void handleDownload(workbookKey, workbook.file_url, `${workbook.title}.pdf`)
                                                                }}
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                disabled={linkLoading[workbookKey]}
                                                            >
                                                                {linkLoading[workbookKey] ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                        Подготавливаем...
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <Download className="w-4 h-4 mr-1" />
                                                                        Скачать
                                                                    </>
                                                                )}
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
                                                                        Изучено
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Zap className="w-4 h-4 mr-1" />
                                                                        Изучено
                                                                    </>
                                                                )}
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

                            {/* Видео-уроки */}
                            {course.has_videos && course.videos && course.videos.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Video className="w-6 h-6 text-purple-600" />
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Видео-уроки ({course.video_count})
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        {course.videos.map((video: CourseVideo) => (
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
                                                            onClick={() => {
                                                                setActiveVideo(video.file_url)
                                                                updateMaterialProgress(
                                                                    video.id,
                                                                    'video',
                                                                    video.title,
                                                                    'completed',
                                                                    100,
                                                                    1800
                                                                )
                                                            }}
                                                            size="sm"
                                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                                        >
                                                            <Play className="w-4 h-4 mr-1" />
                                                            Смотреть
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDownload(video.file_url, `${video.title}.mp4`)}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Скачать
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
                                                                    Изучено
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap className="w-4 h-4 mr-1" />
                                                                    Изучено
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Аудио-настройки */}
                            {course.has_audio && course.audio && course.audio.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Volume2 className="w-6 h-6 text-orange-600" />
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Аудио-настройки ({course.audio_count})
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        {course.audio.map((audioItem: CourseAudio) => (
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
                                                            onClick={() => {
                                                                setActiveAudio(audioItem.file_url)
                                                                updateMaterialProgress(
                                                                    audioItem.id,
                                                                    'audio',
                                                                    audioItem.title,
                                                                    'completed',
                                                                    100,
                                                                    1200
                                                                )
                                                            }}
                                                            size="sm"
                                                            className="bg-orange-600 hover:bg-orange-700 text-white"
                                                        >
                                                            <Play className="w-4 h-4 mr-1" />
                                                            Слушать
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDownload(audioItem.file_url, `${audioItem.title}.mp3`)}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Скачать
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
                                                                    Изучено
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap className="w-4 h-4 mr-1" />
                                                                    Изучено
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Боковая панель */}
                        <div className="space-y-6">
                            {/* Прогресс */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Прогресс курса</h3>

                                {/* Прогресс-бар */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Общий прогресс</span>
                                        <span>{getCompletionPercentage()}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${getCompletionPercentage()}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Статистика */}
                                <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <div className="text-lg font-bold text-blue-600">{getCompletedItems()}</div>
                                        <div className="text-xs text-blue-500">Завершено</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <div className="text-lg font-bold text-green-600">{getTotalStudyTime()}</div>
                                        <div className="text-xs text-green-500">Время изучения</div>
                                    </div>
                                </div>

                                {/* Детальный прогресс */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span>Основной материал</span>
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

                            {/* Баллы и достижения */}
                            {userPoints && (
                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Star className="w-5 h-5 text-yellow-500" />
                                        Ваши баллы
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Всего баллов:</span>
                                            <span className="font-bold text-yellow-600">{userPoints.total_points}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Уровень:</span>
                                            <span className="font-bold text-blue-600">{userPoints.current_level}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Серия дней:</span>
                                            <span className="font-bold text-green-600">{userPoints.streak_days}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                            <div
                                                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                                                style={{ width: `${((userPoints.total_points % 100) / 100) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-center text-gray-500">
                                            До следующего уровня: {userPoints.points_to_next_level} баллов
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Информация о курсе */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация о курсе</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Продолжительность:</span>
                                        <span className="font-medium">{course.course_duration_minutes || 25} мин</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Видео:</span>
                                        <span className="font-medium">{course.video_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Тетради:</span>
                                        <span className="font-medium">{course.workbook_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Аудио:</span>
                                        <span className="font-medium">{course.audio_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Модальное окно для видео */}
                {activeVideo && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Видео-урок</h3>
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

                {/* Модальное окно для аудио */}
                {activeAudio && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Аудио-настройка</h3>
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

                {/* Уведомление о достижении */}
                {showAchievement && (
                    <div className="fixed top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl shadow-2xl p-6 max-w-sm z-50 animate-bounce">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="text-3xl">{showAchievement.icon}</div>
                            <div>
                                <h4 className="font-bold text-white text-lg">Достижение получено!</h4>
                                <p className="text-yellow-100 text-sm">+{showAchievement.points_awarded} баллов</p>
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
        </PageLayout>
    )
}
