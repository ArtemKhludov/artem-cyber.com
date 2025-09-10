'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Video, Volume2, Plus, Save, Trash2, Edit, Upload, Link } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'

interface MiniCourseManagementProps {
    onClose?: () => void
}

export function MiniCourseManagement({ onClose }: MiniCourseManagementProps) {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [editingDocument, setEditingDocument] = useState<Document | null>(null)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState<string | null>(null)

    // Форма для редактирования
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price_rub: 0,
        file_url: '',
        cover_url: '',
        course_type: 'pdf' as 'pdf' | 'mini_course',
        workbook_url: '',
        video_urls: [] as string[],
        audio_url: '',
        video_preview_url: '',
        course_duration_minutes: 0,
        video_count: 0,
        has_workbook: false,
        has_audio: false,
        has_videos: false
    })

    useEffect(() => {
        loadDocuments()
    }, [])

    const loadDocuments = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error loading documents:', error)
                return
            }

            setDocuments(data || [])
        } catch (error) {
            console.error('Error loading documents:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (document: Document) => {
        setEditingDocument(document)
        setFormData({
            title: document.title,
            description: document.description,
            price_rub: document.price_rub,
            file_url: document.file_url,
            cover_url: document.cover_url || '',
            course_type: document.course_type || 'pdf',
            workbook_url: document.workbook_url || '',
            video_urls: document.video_urls || [],
            audio_url: document.audio_url || '',
            video_preview_url: document.video_preview_url || '',
            course_duration_minutes: document.course_duration_minutes || 0,
            video_count: document.video_count || 0,
            has_workbook: document.has_workbook || false,
            has_audio: document.has_audio || false,
            has_videos: document.has_videos || false
        })
    }

    const handleSave = async () => {
        if (!editingDocument) return

        try {
            setSaving(true)

            const updateData = {
                ...formData,
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('documents')
                .update(updateData)
                .eq('id', editingDocument.id)

            if (error) {
                console.error('Error updating document:', error)
                alert('Ошибка при сохранении документа')
                return
            }

            alert('Документ успешно обновлен!')
            setEditingDocument(null)
            loadDocuments()
        } catch (error) {
            console.error('Error saving document:', error)
            alert('Ошибка при сохранении документа')
        } finally {
            setSaving(false)
        }
    }

    const handleAddVideoUrl = () => {
        setFormData(prev => ({
            ...prev,
            video_urls: [...prev.video_urls, '']
        }))
    }

    const handleRemoveVideoUrl = (index: number) => {
        setFormData(prev => ({
            ...prev,
            video_urls: prev.video_urls.filter((_, i) => i !== index)
        }))
    }

    const handleVideoUrlChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            video_urls: prev.video_urls.map((url, i) => i === index ? value : url)
        }))
    }

    // Функция для загрузки файла в Supabase Storage
    const handleFileUpload = async (file: File, type: 'main' | 'workbook' | 'video' | 'audio' | 'preview', videoIndex?: number) => {
        if (!editingDocument) return

        try {
            setUploading(`${type}-${videoIndex || ''}`)

            // Определяем путь для файла
            let filePath = ''
            const courseSlug = editingDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')

            switch (type) {
                case 'main':
                    filePath = `courses/${courseSlug}/main.pdf`
                    break
                case 'workbook':
                    filePath = `courses/${courseSlug}/workbook.pdf`
                    break
                case 'video':
                    filePath = `courses/${courseSlug}/videos/video${videoIndex || 1}.mp4`
                    break
                case 'preview':
                    filePath = `courses/${courseSlug}/videos/preview.mp4`
                    break
                case 'audio':
                    filePath = `courses/${courseSlug}/audio.mp3`
                    break
            }

            // Создаем FormData для загрузки
            const formData = new FormData()
            formData.append('file', file)
            formData.append('path', filePath)
            formData.append('bucket', 'course-materials')

            // Загружаем файл
            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Ошибка загрузки файла')
            }

            // Обновляем форму с новым URL
            switch (type) {
                case 'main':
                    setFormData(prev => ({ ...prev, file_url: result.url }))
                    break
                case 'workbook':
                    setFormData(prev => ({ ...prev, workbook_url: result.url }))
                    break
                case 'video':
                    if (videoIndex !== undefined) {
                        setFormData(prev => ({
                            ...prev,
                            video_urls: prev.video_urls.map((url, i) => i === videoIndex ? result.url : url)
                        }))
                    }
                    break
                case 'preview':
                    setFormData(prev => ({ ...prev, video_preview_url: result.url }))
                    break
                case 'audio':
                    setFormData(prev => ({ ...prev, audio_url: result.url }))
                    break
            }

            alert('Файл успешно загружен!')

        } catch (error) {
            console.error('Upload error:', error)
            alert('Ошибка загрузки файла: ' + (error as Error).message)
        } finally {
            setUploading(null)
        }
    }

    // Функция для получения URL файла из Storage
    const getStorageUrl = async (path: string) => {
        try {
            const response = await fetch(`/api/storage/url?path=${encodeURIComponent(path)}`)
            const result = await response.json()
            return result.success ? result.url : null
        } catch (error) {
            console.error('Error getting storage URL:', error)
            return null
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Управление мини-курсами</h2>
                {onClose && (
                    <Button variant="outline" onClick={onClose}>
                        Закрыть
                    </Button>
                )}
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list">Список документов</TabsTrigger>
                    <TabsTrigger value="edit" disabled={!editingDocument}>
                        Редактирование
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    <div className="grid gap-4">
                        {documents.map((doc) => (
                            <Card key={doc.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-lg">{doc.title}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.course_type === 'mini_course'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {doc.course_type === 'mini_course' ? 'Мини-курс' : 'PDF'}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2">{doc.description}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>Цена: {doc.price_rub.toLocaleString()} ₽</span>
                                            {doc.course_type === 'mini_course' && (
                                                <>
                                                    {doc.has_videos && <span>📹 {doc.video_count || 0} видео</span>}
                                                    {doc.has_workbook && <span>📄 Рабочая тетрадь</span>}
                                                    {doc.has_audio && <span>🎵 Аудио</span>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(doc)}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Редактировать
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="edit" className="space-y-6">
                    {editingDocument && (
                        <div className="space-y-6">
                            {/* Основная информация */}
                            <Card className="p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Основная информация
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="title">Название</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="price_rub">Цена (₽)</Label>
                                        <Input
                                            id="price_rub"
                                            type="number"
                                            value={formData.price_rub}
                                            onChange={(e) => setFormData(prev => ({ ...prev, price_rub: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label htmlFor="description">Описание</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            rows={3}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="file_url">URL основного PDF</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="file_url"
                                                value={formData.file_url}
                                                onChange={(e) => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
                                                placeholder="Или загрузите файл"
                                            />
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleFileUpload(file, 'main')
                                                }}
                                                className="hidden"
                                                id="main-pdf-upload"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => document.getElementById('main-pdf-upload')?.click()}
                                                disabled={uploading === 'main'}
                                            >
                                                {uploading === 'main' ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                ) : (
                                                    <Upload className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="cover_url">URL обложки</Label>
                                        <Input
                                            id="cover_url"
                                            value={formData.cover_url}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cover_url: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="course_type">Тип контента</Label>
                                        <select
                                            id="course_type"
                                            value={formData.course_type}
                                            onChange={(e) => setFormData(prev => ({ ...prev, course_type: e.target.value as 'pdf' | 'mini_course' }))}
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="pdf">PDF документ</option>
                                            <option value="mini_course">Мини-курс</option>
                                        </select>
                                    </div>
                                </div>
                            </Card>

                            {/* Контент мини-курса */}
                            {formData.course_type === 'mini_course' && (
                                <>
                                    {/* Рабочая тетрадь */}
                                    <Card className="p-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <FileText className="w-5 h-5" />
                                            Рабочая тетрадь
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="has_workbook"
                                                    checked={formData.has_workbook}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, has_workbook: e.target.checked }))}
                                                />
                                                <Label htmlFor="has_workbook">Включить рабочую тетрадь</Label>
                                            </div>
                                            {formData.has_workbook && (
                                                <div>
                                                    <Label htmlFor="workbook_url">URL рабочей тетради</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="workbook_url"
                                                            value={formData.workbook_url}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, workbook_url: e.target.value }))}
                                                            placeholder="Или загрузите файл"
                                                        />
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) handleFileUpload(file, 'workbook')
                                                            }}
                                                            className="hidden"
                                                            id="workbook-upload"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => document.getElementById('workbook-upload')?.click()}
                                                            disabled={uploading === 'workbook'}
                                                        >
                                                            {uploading === 'workbook' ? (
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                            ) : (
                                                                <Upload className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Видео */}
                                    <Card className="p-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Video className="w-5 h-5" />
                                            Видео-уроки
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="has_videos"
                                                    checked={formData.has_videos}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, has_videos: e.target.checked }))}
                                                />
                                                <Label htmlFor="has_videos">Включить видео-уроки</Label>
                                            </div>
                                            {formData.has_videos && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <Label htmlFor="video_count">Количество видео</Label>
                                                        <Input
                                                            id="video_count"
                                                            type="number"
                                                            value={formData.video_count}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, video_count: parseInt(e.target.value) || 0 }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="video_preview_url">URL превью видео</Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                id="video_preview_url"
                                                                value={formData.video_preview_url}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, video_preview_url: e.target.value }))}
                                                                placeholder="Или загрузите файл"
                                                            />
                                                            <input
                                                                type="file"
                                                                accept=".mp4"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0]
                                                                    if (file) handleFileUpload(file, 'preview')
                                                                }}
                                                                className="hidden"
                                                                id="preview-upload"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => document.getElementById('preview-upload')?.click()}
                                                                disabled={uploading === 'preview'}
                                                            >
                                                                {uploading === 'preview' ? (
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                                ) : (
                                                                    <Upload className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label>URL видео-файлов</Label>
                                                        {formData.video_urls.map((url, index) => (
                                                            <div key={index} className="flex gap-2 mb-2">
                                                                <Input
                                                                    value={url}
                                                                    onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                                                                    placeholder={`URL видео ${index + 1} или загрузите файл`}
                                                                />
                                                                <input
                                                                    type="file"
                                                                    accept=".mp4"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0]
                                                                        if (file) handleFileUpload(file, 'video', index)
                                                                    }}
                                                                    className="hidden"
                                                                    id={`video-upload-${index}`}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => document.getElementById(`video-upload-${index}`)?.click()}
                                                                    disabled={uploading === `video-${index}`}
                                                                >
                                                                    {uploading === `video-${index}` ? (
                                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                                    ) : (
                                                                        <Upload className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleRemoveVideoUrl(index)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleAddVideoUrl}
                                                        >
                                                            <Plus className="w-4 h-4 mr-2" />
                                                            Добавить видео
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Аудио */}
                                    <Card className="p-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Volume2 className="w-5 h-5" />
                                            Аудио-настройка
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="has_audio"
                                                    checked={formData.has_audio}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, has_audio: e.target.checked }))}
                                                />
                                                <Label htmlFor="has_audio">Включить аудио-настройку</Label>
                                            </div>
                                            {formData.has_audio && (
                                                <div>
                                                    <Label htmlFor="audio_url">URL аудио-файла</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="audio_url"
                                                            value={formData.audio_url}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, audio_url: e.target.value }))}
                                                            placeholder="Или загрузите файл"
                                                        />
                                                        <input
                                                            type="file"
                                                            accept=".mp3"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) handleFileUpload(file, 'audio')
                                                            }}
                                                            className="hidden"
                                                            id="audio-upload"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => document.getElementById('audio-upload')?.click()}
                                                            disabled={uploading === 'audio'}
                                                        >
                                                            {uploading === 'audio' ? (
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                            ) : (
                                                                <Upload className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Метаданные курса */}
                                    <Card className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Метаданные курса</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="course_duration_minutes">Продолжительность (минуты)</Label>
                                                <Input
                                                    id="course_duration_minutes"
                                                    type="number"
                                                    value={formData.course_duration_minutes}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, course_duration_minutes: parseInt(e.target.value) || 0 }))}
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                </>
                            )}

                            {/* Кнопки действий */}
                            <div className="flex gap-4">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setEditingDocument(null)}
                                >
                                    Отмена
                                </Button>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
