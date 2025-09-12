'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
    Lock
} from 'lucide-react'
import Link from 'next/link'
import type { Document, Workbook, CourseVideo, CourseAudio } from '@/types'

export default function CoursePlayer() {
    const params = useParams()
    const courseId = params.id as string

    const [course, setCourse] = useState<Document | null>(null)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeVideo, setActiveVideo] = useState<string | null>(null)
    const [activeAudio, setActiveAudio] = useState<string | null>(null)
    const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())

    useEffect(() => {
        const checkAccess = async () => {
            try {
                setLoading(true)
                setError(null)

                const sessionToken = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('session_token='))
                    ?.split('=')[1]

                if (!sessionToken) {
                    setError('Необходима авторизация')
                    return
                }

                const response = await fetch(`/api/courses/${courseId}/access`, {
                    headers: {
                        'x-session-token': sessionToken
                    }
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (response.status === 401) {
                        setError('Необходима авторизация')
                    } else if (response.status === 403) {
                        setError('Курс не приобретен')
                    } else if (response.status === 404) {
                        setError('Курс не найден')
                    } else {
                        setError(errorData.error || 'Ошибка загрузки курса')
                    }
                    return
                }

                const data = await response.json()
                setCourse(data.course)
                setUser(data.user)

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
    }, [courseId])

    const markAsCompleted = (itemId: string, itemType: string) => {
        setCompletedItems(prev => new Set([...prev, `${itemType}_${itemId}`]))
    }

    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const getTotalItems = (): number => {
        let total = 1 // основной PDF
        if (course?.workbooks) total += course.workbooks.length
        if (course?.videos) total += course.videos.length
        if (course?.audio) total += course.audio.length
        return total
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
                                <Link href="/courses">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    К каталогу
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/courses">
                                    Посмотреть другие курсы
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </PageLayout>
        )
    }

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
                                <div className="text-sm text-gray-600">
                                    Прогресс: {completedItems.size} из {getTotalItems()} материалов
                                </div>
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
                                    {completedItems.has(`pdf_main`) && (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    )}
                                </div>
                                <p className="text-gray-600 mb-4">
                                    {course.main_pdf_description || 'Основной PDF-документ курса'}
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => {
                                            handleDownload(course.file_url, `${course.title}.pdf`)
                                            markAsCompleted('main', 'pdf')
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Скачать PDF
                                    </Button>
                                    <Button
                                        onClick={() => markAsCompleted('main', 'pdf')}
                                        variant="outline"
                                    >
                                        Отметить как изученное
                                    </Button>
                                </div>
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
                                        {course.workbooks.map((workbook: Workbook) => (
                                            <div key={workbook.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-medium text-gray-900">{workbook.title}</h3>
                                                            {completedItems.has(`workbook_${workbook.id}`) && (
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
                                                                handleDownload(workbook.file_url, `${workbook.title}.pdf`)
                                                                markAsCompleted(workbook.id, 'workbook')
                                                            }}
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Скачать
                                                        </Button>
                                                        <Button
                                                            onClick={() => markAsCompleted(workbook.id, 'workbook')}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            Изучено
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
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
                                                            {completedItems.has(`video_${video.id}`) && (
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
                                                                markAsCompleted(video.id, 'video')
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
                                                            {completedItems.has(`audio_${audioItem.id}`) && (
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
                                                                markAsCompleted(audioItem.id, 'audio')
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
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span>Основной материал</span>
                                        <span>{completedItems.has('pdf_main') ? '✓' : '○'}</span>
                                    </div>
                                    {course.workbooks?.map((workbook: Workbook) => (
                                        <div key={workbook.id} className="flex justify-between text-sm">
                                            <span className="truncate">{workbook.title}</span>
                                            <span>{completedItems.has(`workbook_${workbook.id}`) ? '✓' : '○'}</span>
                                        </div>
                                    ))}
                                    {course.videos?.map((video: CourseVideo) => (
                                        <div key={video.id} className="flex justify-between text-sm">
                                            <span className="truncate">{video.title}</span>
                                            <span>{completedItems.has(`video_${video.id}`) ? '✓' : '○'}</span>
                                        </div>
                                    ))}
                                    {course.audio?.map((audioItem: CourseAudio) => (
                                        <div key={audioItem.id} className="flex justify-between text-sm">
                                            <span className="truncate">{audioItem.title}</span>
                                            <span>{completedItems.has(`audio_${audioItem.id}`) ? '✓' : '○'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

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
            </div>
        </PageLayout>
    )
}
