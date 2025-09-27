'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Download, FileText, Volume2, Clock, Video, Lock } from 'lucide-react'
import type { Document } from '@/types'
import { useCourseMaterials } from '@/hooks/useCourseMaterials'

interface CourseContentProps {
    document: Document
    isPurchased?: boolean
}

export function CourseContent({ document, isPurchased = false }: CourseContentProps) {
    const [activeVideo, setActiveVideo] = useState<number | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [inlineError, setInlineError] = useState<string | null>(null)

    // Используем хук для безопасного доступа к материалам
    const { materials, loading, error, refetch } = useCourseMaterials(document.id, {
        file_url: document.file_url,
        workbook_url: document.workbook_url,
        video_urls: document.video_urls,
        audio_url: document.audio_url,
        video_preview_url: document.video_preview_url,
        cover_url: document.cover_url,
    })

    // Проверяем, является ли это мини-курсом
    const isMiniCourse = document.course_type === 'mini_course'

    if (!isMiniCourse) {
        return null
    }

    const videoTitles = [
        'Что такое намерение до мысли',
        'Ошибки при работе с намерением',
        'Пример перезаписи на простом кейсе'
    ]

    const handleVideoPlay = (index: number) => {
        if (!isPurchased) {
            alert('Для просмотра видео необходимо приобрести мини-курс')
            return
        }
        setInlineError(null)
        setActiveVideo(index)
        setIsPlaying(true)
    }

    const handleDownload = (url: string, filename: string) => {
        if (!isPurchased) {
            alert('Для скачивания материалов необходимо приобрести мини-курс')
            return
        }

        const link = window.document.createElement('a')
        link.href = url
        link.download = filename
        link.target = '_blank'
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
    }

    const toStoragePath = (fileUrl: string): string => {
        try {
            const noProto = fileUrl.replace(/^https?:\/\/[^/]+\/?/, '')
            const match = noProto.match(/(?:^|\/)(course|courses)\/(.+)$/)
            if (match) {
                return `${match[1]}/${match[2]}`
            }
            const base = noProto.split('/')
            const fileName = base[base.length - 1]
            return `course/${document.id}/${fileName}`
        } catch {
            return `course/${document.id}/${encodeURIComponent(fileUrl)}`
        }
    }

    const fetchSignedUrl = async (fileUrl: string): Promise<string> => {
        const path = toStoragePath(fileUrl)
        const res = await fetch(`/api/materials/signed-url?documentId=${encodeURIComponent(document.id)}&path=${encodeURIComponent(path)}`, {
            credentials: 'include'
        })
        if (!res.ok) {
            throw new Error('access_denied')
        }
        const data = await res.json()
        // TTL hint
        const ttl = typeof data?.expiresIn === 'number' ? data.expiresIn : 120
        const hint = window.document.getElementById(`ttl-hint-${document.id}`)
        if (hint) {
            hint.textContent = `Ссылка действует ~${ttl} сек`
        }
        return data.url as string
    }

    return (
        <div className="space-y-6">
            {/* Основной PDF */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Основной PDF</h3>
                </div>
                <p className="text-gray-600 mb-4">
                    «Квантовая Архитектура Намерения» - 20-30 страниц плотного текста с схемами
                </p>
                {isPurchased ? (
                    <Button
                        onClick={async () => {
                            try {
                                setInlineError(null)
                                const signed = await fetchSignedUrl(document.file_url)
                                handleDownload(signed, `${document.title}.pdf`)
                            } catch (e) {
                                setInlineError('Не удалось получить безопасную ссылку. Ссылка могла истечь. Попробуйте снова.')
                            }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Скачать PDF
                    </Button>
                ) : (
                    <div className="text-sm text-gray-500">
                        Доступно после покупки
                    </div>
                )}
                <div id={`ttl-hint-${document.id}`} className="mt-2 text-xs text-gray-500">Ссылка действует около 2 минут. При истечении — запросите заново.</div>
                {inlineError && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        <Clock className="w-4 h-4 mt-0.5" />
                        <div className="flex-1">
                            <p>{inlineError}</p>
                            <div className="mt-2 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setInlineError(null); void refetch(); }}>Повторить</Button>
                                <Button size="sm" variant="ghost" asChild>
                                    <a href={`mailto:support@energylogic.ai?subject=${encodeURIComponent('Проблема со скачиванием PDF')}&body=${encodeURIComponent(`Документ: ${document.title} (${document.id})`)}`}>Связаться с поддержкой</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Рабочие тетради */}
            {document.has_workbook && (document.workbooks && document.workbooks.length > 0 || document.workbook_url) && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Рабочие тетради
                            {document.workbooks && document.workbooks.length > 0 && (
                                <span className="text-sm text-gray-500 ml-2">
                                    ({document.workbooks.length} тетрадей)
                                </span>
                            )}
                        </h3>
                    </div>

                    {document.workbooks && document.workbooks.length > 0 ? (
                        // Новые множественные рабочие тетради
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                Рабочие тетради с таблицами, чек-листами и практическими заданиями:
                            </p>
                            <div className="space-y-3">
                                {document.workbooks.map((workbook, index) => (
                                    <div key={workbook.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 mb-1">
                                                    {workbook.title}
                                                </h4>
                                                {workbook.description && (
                                                    <p className="text-sm text-gray-600">
                                                        {workbook.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {isPurchased ? (
                                                    <Button
                                                        onClick={async () => {
                                                            try {
                                                                setInlineError(null)
                                                                const signed = await fetchSignedUrl(workbook.file_url)
                                                                handleDownload(signed, `${workbook.title}.pdf`)
                                                            } catch {
                                                                setInlineError('Не удалось получить ссылку на рабочую тетрадь. Попробуйте снова.')
                                                            }
                                                        }}
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        <Download className="w-4 h-4 mr-1" />
                                                        Скачать
                                                    </Button>
                                                ) : (
                                                    <div className="text-sm text-gray-500">
                                                        Доступно после покупки
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Старая одиночная рабочая тетрадь (для обратной совместимости)
                        <div>
                            <p className="text-gray-600 mb-4">
                                Краткая рабочая тетрадь (7-10 страниц) с таблицами и чек-листами:
                            </p>
                            <ul className="text-sm text-gray-600 mb-4 space-y-1">
                                <li>• «Истинное намерение или ложное?»</li>
                                <li>• «Алгоритм перезаписи в 5 шагов»</li>
                                <li>• «Дневник намерения (шаблон на неделю)»</li>
                            </ul>
                            {isPurchased ? (
                                <Button
                                    onClick={async () => {
                                        try {
                                            setInlineError(null)
                                            const signed = await fetchSignedUrl(document.workbook_url!)
                                            handleDownload(signed, `${document.title}-workbook.pdf`)
                                        } catch {
                                            setInlineError('Не удалось получить ссылку на рабочую тетрадь. Попробуйте снова.')
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Скачать тетрадь
                                </Button>
                            ) : (
                                <div className="text-sm text-gray-500">
                                    Доступно после покупки
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Видео */}
            {document.has_videos && document.videos && document.videos.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <Video className="w-6 h-6 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Видео-уроки</h3>
                        <span className="text-sm text-gray-500">
                            ({document.video_count || document.videos.length} видео по 5-7 минут)
                        </span>
                    </div>

                    <div className="space-y-4">
                        {document.videos.map((video, index) => (
                            <div key={video.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 mb-1">
                                            {video.title || `Видео ${index + 1}`}
                                        </h4>
                                        {video.description && (
                                            <p className="text-sm text-gray-600 mb-1">
                                                {video.description}
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-500">
                                            Продолжительность: 5-7 минут
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {isPurchased ? (
                                            <>
                                                <Button
                                                    onClick={() => handleVideoPlay(index)}
                                                    size="sm"
                                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                                >
                                                    <Play className="w-4 h-4 mr-1" />
                                                    Смотреть
                                                </Button>
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            setInlineError(null)
                                                            const signed = await fetchSignedUrl(video.file_url)
                                                            handleDownload(signed, `${video.title || document.title}-video-${index + 1}.mp4`)
                                                        } catch {
                                                            setInlineError('Не удалось получить ссылку на видео. Попробуйте снова.')
                                                        }
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Download className="w-4 h-4 mr-1" />
                                                    Скачать
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-500">
                                                Доступно после покупки
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Аудио-настройка */}
            {document.has_audio && document.audio && document.audio.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <Volume2 className="w-6 h-6 text-orange-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Аудио-настройка</h3>
                        <span className="text-sm text-gray-500">
                            ({document.audio_count || document.audio.length} аудио по 5 минут)
                        </span>
                    </div>

                    <div className="space-y-4">
                        {document.audio.map((audioItem, index) => (
                            <div key={audioItem.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 mb-1">
                                            {audioItem.title || `Аудио ${index + 1}`}
                                        </h4>
                                        {audioItem.description && (
                                            <p className="text-sm text-gray-600 mb-1">
                                                {audioItem.description}
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-500">
                                            Продолжительность: 5 минут
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {isPurchased ? (
                                            <>
                                                <Button
                                                    onClick={() => {
                                                        if (!isPurchased) {
                                                            alert('Для прослушивания аудио необходимо приобрести мини-курс')
                                                            return
                                                        }
                                                        // Здесь можно добавить встроенный аудио-плеер
                                                        window.open(audioItem.file_url, '_blank')
                                                    }}
                                                    size="sm"
                                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                                >
                                                    <Play className="w-4 h-4 mr-1" />
                                                    Слушать
                                                </Button>
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            setInlineError(null)
                                                            const signed = await fetchSignedUrl(audioItem.file_url)
                                                            handleDownload(signed, `${audioItem.title || document.title}-audio-${index + 1}.mp3`)
                                                        } catch {
                                                            setInlineError('Не удалось получить ссылку на аудио. Попробуйте снова.')
                                                        }
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Download className="w-4 h-4 mr-1" />
                                                    Скачать
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-500">
                                                Доступно после покупки
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Общая информация о курсе */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Информация о курсе</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Общая продолжительность:</span>
                        <span className="font-medium ml-2">
                            {document.course_duration_minutes || 25} минут
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Количество видео:</span>
                        <span className="font-medium ml-2">
                            {document.video_count || 0}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Рабочая тетрадь:</span>
                        <span className="font-medium ml-2">
                            {document.has_workbook ? 'Включена' : 'Нет'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Аудио-настройка:</span>
                        <span className="font-medium ml-2">
                            {document.has_audio ? 'Включена' : 'Нет'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
