'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Upload,
    FileText,
    Video,
    Volume2,
    BookOpen,
    Play,
    Image,
    File,
    Settings,
    Info
} from 'lucide-react'
import type { Document } from '@/types'

interface CourseFormData {
    title: string
    description: string
    price_rub: string
    course_type: 'pdf' | 'mini_course'
    file_url: string
    cover_url: string
    page_count: string
    workbook_url: string
    video_urls: string[]
    audio_url: string
    video_preview_url: string
    course_duration_minutes: string
    video_count: string
    has_workbook: boolean
    has_audio: boolean
    has_videos: boolean
}

interface CourseModalTabsProps {
    isEditing: boolean
    formData: CourseFormData | Document
    setFormData: (data: any) => void
    onFileUpload: (file: File, path: string, field: string, documentId?: string) => void
    uploading: { [key: string]: boolean }
}

export function CourseModalTabs({ 
    isEditing, 
    formData, 
    setFormData, 
    onFileUpload, 
    uploading 
}: CourseModalTabsProps) {
    const [activeTab, setActiveTab] = useState<'basic' | 'files' | 'settings'>('basic')

    const handleFileUpload = (file: File, path: string, field: string) => {
        const documentId = isEditing ? (formData as Document).id : undefined
        onFileUpload(file, path, field, documentId)
    }

    const getSlug = () => {
        const title = isEditing ? (formData as Document).title : (formData as CourseFormData).title
        return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    }

    return (
        <div className="space-y-4">
            {/* Табы */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('basic')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'basic'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Info className="w-4 h-4 inline mr-2" />
                    Основная информация
                </button>
                <button
                    onClick={() => setActiveTab('files')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'files'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Файлы курса
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'settings'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Настройки
                </button>
            </div>

            {/* Контент табов */}
            <div className="max-h-96 overflow-y-auto">
                {activeTab === 'basic' && (
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Название *</Label>
                            <Input
                                id="title"
                                value={isEditing ? (formData as Document).title : (formData as CourseFormData).title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Название курса"
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="description">Описание</Label>
                            <Textarea
                                id="description"
                                value={isEditing ? (formData as Document).description : (formData as CourseFormData).description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Описание курса"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="course_type">Тип курса</Label>
                                <select
                                    id="course_type"
                                    value={isEditing ? (formData as Document).course_type || 'pdf' : (formData as CourseFormData).course_type}
                                    onChange={(e) => setFormData({ ...formData, course_type: e.target.value as 'pdf' | 'mini_course' })}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="mini_course">Мини-курс</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="price_rub">Цена (₽) *</Label>
                                <Input
                                    id="price_rub"
                                    type="number"
                                    value={isEditing ? (formData as Document).price_rub : (formData as CourseFormData).price_rub}
                                    onChange={(e) => setFormData({ ...formData, price_rub: e.target.value })}
                                    placeholder="2990"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="page_count">Количество страниц</Label>
                                <Input
                                    id="page_count"
                                    type="number"
                                    value={isEditing ? ((formData as any).page_count || 0) : (formData as CourseFormData).page_count}
                                    onChange={(e) => setFormData({ ...formData, page_count: e.target.value })}
                                    placeholder="45"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="space-y-4">
                        {/* Обложка */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                Обложка курса
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={isEditing ? (formData as Document).cover_url || '' : (formData as CourseFormData).cover_url}
                                    onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                                    placeholder="URL обложки"
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            handleFileUpload(file, `courses/${getSlug()}/cover.png`, 'cover_url')
                                        }
                                    }}
                                    className="hidden"
                                    id="cover-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('cover-upload')?.click()}
                                    disabled={uploading[`${isEditing ? (formData as Document).id : 'new'}_cover_url`]}
                                >
                                    {uploading[`${isEditing ? (formData as Document).id : 'new'}_cover_url`] ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Основной PDF */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Основной PDF
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={isEditing ? (formData as Document).file_url || '' : (formData as CourseFormData).file_url}
                                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                                    placeholder="URL основного PDF"
                                />
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            handleFileUpload(file, `courses/${getSlug()}/main.pdf`, 'file_url')
                                        }
                                    }}
                                    className="hidden"
                                    id="pdf-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('pdf-upload')?.click()}
                                    disabled={uploading[`${isEditing ? (formData as Document).id : 'new'}_file_url`]}
                                >
                                    {uploading[`${isEditing ? (formData as Document).id : 'new'}_file_url`] ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Превью видео */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <Play className="w-4 h-4" />
                                Превью видео
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={isEditing ? (formData as Document).video_preview_url || '' : (formData as CourseFormData).video_preview_url}
                                    onChange={(e) => setFormData({ ...formData, video_preview_url: e.target.value })}
                                    placeholder="URL превью видео"
                                />
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            handleFileUpload(file, `courses/${getSlug()}/preview.mp4`, 'video_preview_url')
                                        }
                                    }}
                                    className="hidden"
                                    id="preview-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('preview-upload')?.click()}
                                    disabled={uploading[`${isEditing ? (formData as Document).id : 'new'}_video_preview_url`]}
                                >
                                    {uploading[`${isEditing ? (formData as Document).id : 'new'}_video_preview_url`] ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Рабочая тетрадь */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Рабочая тетрадь
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={isEditing ? (formData as Document).workbook_url || '' : (formData as CourseFormData).workbook_url}
                                    onChange={(e) => setFormData({ ...formData, workbook_url: e.target.value })}
                                    placeholder="URL рабочей тетради"
                                />
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            handleFileUpload(file, `courses/${getSlug()}/workbook.pdf`, 'workbook_url')
                                        }
                                    }}
                                    className="hidden"
                                    id="workbook-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('workbook-upload')?.click()}
                                    disabled={uploading[`${isEditing ? (formData as Document).id : 'new'}_workbook_url`]}
                                >
                                    {uploading[`${isEditing ? (formData as Document).id : 'new'}_workbook_url`] ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Аудио */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4" />
                                Аудио-настройка
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={isEditing ? (formData as Document).audio_url || '' : (formData as CourseFormData).audio_url}
                                    onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                                    placeholder="URL аудио файла"
                                />
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            handleFileUpload(file, `courses/${getSlug()}/audio.mp3`, 'audio_url')
                                        }
                                    }}
                                    className="hidden"
                                    id="audio-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('audio-upload')?.click()}
                                    disabled={uploading[`${isEditing ? (formData as Document).id : 'new'}_audio_url`]}
                                >
                                    {uploading[`${isEditing ? (formData as Document).id : 'new'}_audio_url`] ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Видео уроки */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Видео уроки
                            </Label>
                            {(isEditing ? (formData as Document).video_urls || ['', '', ''] : (formData as CourseFormData).video_urls).map((url, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={url || ''}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                const newVideoUrls = [...((formData as Document).video_urls || ['', '', ''])]
                                                newVideoUrls[index] = e.target.value
                                                setFormData({ ...formData, video_urls: newVideoUrls })
                                            } else {
                                                const newVideoUrls = [...(formData as CourseFormData).video_urls]
                                                newVideoUrls[index] = e.target.value
                                                setFormData({ ...formData, video_urls: newVideoUrls })
                                            }
                                        }}
                                        placeholder={`URL видео урока ${index + 1}`}
                                    />
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(file, `courses/${getSlug()}/videos/video${index + 1}.mp4`, 'video_urls')
                                            }
                                        }}
                                        className="hidden"
                                        id={`video-upload-${index}`}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById(`video-upload-${index}`)?.click()}
                                        disabled={uploading[`${isEditing ? (formData as Document).id : 'new'}_video_urls`]}
                                    >
                                        {uploading[`${isEditing ? (formData as Document).id : 'new'}_video_urls`] ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="course_duration_minutes">Продолжительность (минуты)</Label>
                                <Input
                                    id="course_duration_minutes"
                                    type="number"
                                    value={isEditing ? (formData as Document).course_duration_minutes || 0 : (formData as CourseFormData).course_duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, course_duration_minutes: e.target.value })}
                                    placeholder="25"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="video_count">Количество видео</Label>
                                <Input
                                    id="video_count"
                                    type="number"
                                    value={isEditing ? (formData as Document).video_count || 0 : (formData as CourseFormData).video_count}
                                    onChange={(e) => setFormData({ ...formData, video_count: e.target.value })}
                                    placeholder="3"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={isEditing ? (formData as Document).has_workbook || false : (formData as CourseFormData).has_workbook}
                                    onChange={(e) => setFormData({ ...formData, has_workbook: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm">Есть рабочая тетрадь</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={isEditing ? (formData as Document).has_audio || false : (formData as CourseFormData).has_audio}
                                    onChange={(e) => setFormData({ ...formData, has_audio: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm">Есть аудио</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={isEditing ? (formData as Document).has_videos || false : (formData as CourseFormData).has_videos}
                                    onChange={(e) => setFormData({ ...formData, has_videos: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm">Есть видео</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
