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

    // Используем хук для безопасного доступа к материалам
    const { materials, loading, error } = useCourseMaterials(document.id, {
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
        setActiveVideo(index)
        setIsPlaying(true)
    }

    const handleDownload = (url: string, filename: string) => {
        if (!isPurchased) {
            alert('Для скачивания материалов необходимо приобрести мини-курс')
            return
        }

        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
                        onClick={() => handleDownload(document.file_url, `${document.title}.pdf`)}
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
                                                        onClick={() => handleDownload(workbook.file_url, `${workbook.title}.pdf`)}
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
                                    onClick={() => handleDownload(document.workbook_url!, `${document.title}-workbook.pdf`)}
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
            {document.has_videos && document.video_urls && document.video_urls.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <Video className="w-6 h-6 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Видео-уроки</h3>
                        <span className="text-sm text-gray-500">
                            ({document.video_count || document.video_urls.length} видео по 5-7 минут)
                        </span>
                    </div>

                    <div className="space-y-4">
                        {document.video_urls.map((videoUrl, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 mb-1">
                                            {videoTitles[index] || `Видео ${index + 1}`}
                                        </h4>
                                        <p className="text-sm text-gray-600">
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
                                                    onClick={() => handleDownload(videoUrl, `${document.title}-video-${index + 1}.mp4`)}
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
            {document.has_audio && document.audio_url && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <Volume2 className="w-6 h-6 text-orange-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Аудио-настройка</h3>
                        <span className="text-sm text-gray-500">(5 минут)</span>
                    </div>
                    <p className="text-gray-600 mb-4">
                        Ведёшь голосом простую практику: «Закрой глаза, почувствуй искру, зафиксируй её, отпусти шум».
                        Это повышает ценность и выглядит как «премиум-дополнение».
                    </p>
                    {isPurchased ? (
                        <div className="flex gap-3">
                            <Button
                                onClick={() => {
                                    if (!isPurchased) {
                                        alert('Для прослушивания аудио необходимо приобрести мини-курс')
                                        return
                                    }
                                    // Здесь можно добавить встроенный аудио-плеер
                                    window.open(document.audio_url, '_blank')
                                }}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Слушать онлайн
                            </Button>
                            <Button
                                onClick={() => handleDownload(document.audio_url, `${document.title}-audio.mp3`)}
                                variant="outline"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Скачать MP3
                            </Button>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500">
                            Доступно после покупки
                        </div>
                    )}
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
