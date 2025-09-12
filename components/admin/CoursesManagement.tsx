'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    FileText,
    Plus,
    Minus,
    Edit,
    Trash2,
    Save,
    X,
    Upload,
    DollarSign,
    Video,
    Volume2,
    BookOpen,
    Play,
    Image,
    File,
    Eye,
    EyeOff,
    Settings,
    Info,
    FileImage
} from 'lucide-react'
import type { Document } from '@/types'
import { CourseModalTabs } from './CourseModalTabs'
import { WorkbooksManager } from './WorkbooksManager'

interface CourseFormData {
    title: string
    description: string
    course_description?: string
    main_pdf_title?: string
    main_pdf_description?: string
    price_rub: string
    course_type: 'pdf' | 'mini_course'
    file_url: string
    cover_url: string
    page_count: string
    video_urls: string[]
    audio_url: string
    video_preview_url: string
    course_duration_minutes: string
    video_count: string
    has_workbook: boolean
    has_audio: boolean
    has_videos: boolean
}

export function CoursesManagement() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingDocument, setEditingDocument] = useState<Document | null>(null)
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
    const [activeModalTab, setActiveModalTab] = useState<'basic' | 'files' | 'settings' | 'workbooks'>('basic')
    const [showWorkbooksManager, setShowWorkbooksManager] = useState(false)
    const [selectedDocumentForWorkbooks, setSelectedDocumentForWorkbooks] = useState<Document | null>(null)

    const [newDocument, setNewDocument] = useState<CourseFormData>({
        title: '',
        description: '',
        course_description: '',
        main_pdf_title: '',
        main_pdf_description: '',
        price_rub: '',
        course_type: 'mini_course',
        file_url: '',
        cover_url: '',
        page_count: '',
        video_urls: ['', '', ''],
        audio_url: '',
        video_preview_url: '',
        course_duration_minutes: '',
        video_count: '3',
        has_workbook: true,
        has_audio: true,
        has_videos: true
    })

    // Функция для генерации правильного slug из названия курса
    const generateSlug = (title: string): string => {
        if (!title) return 'untitled'

        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Удаляем все кроме букв, цифр и пробелов
            .replace(/\s+/g, '-')        // Заменяем пробелы на дефисы
            .replace(/-+/g, '-')         // Убираем множественные дефисы
            .replace(/^-|-$/g, '') || 'untitled' // Убираем дефисы в начале и конце
    }

    useEffect(() => {
        loadDocuments()
    }, [])

    const loadDocuments = async () => {
        try {
            const response = await fetch('/api/admin/documents')
            if (response.ok) {
                const data = await response.json()
                setDocuments(data.documents)
            } else {
                console.error('Ошибка загрузки документов')
            }
        } catch (error) {
            console.error('Ошибка загрузки документов:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (file: File, path: string, field: string, documentId?: string) => {
        const uploadKey = `${documentId || 'new'}_${field}`
        setUploading(prev => ({ ...prev, [uploadKey]: true }))

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('path', path)
            formData.append('bucket', 'course-materials')

            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                const publicUrl = data.url

                if (documentId && editingDocument) {
                    // Обновляем существующий документ
                    const updatedDocument = { ...editingDocument, [field]: publicUrl }
                    setEditingDocument(updatedDocument)
                } else {
                    // Обновляем форму нового документа
                    if (field === 'video_urls') {
                        const videoIndex = parseInt(path.split('video')[1]?.split('.')[0]) - 1
                        const newVideoUrls = [...newDocument.video_urls]
                        newVideoUrls[videoIndex] = publicUrl
                        setNewDocument({ ...newDocument, video_urls: newVideoUrls })
                    } else {
                        setNewDocument({ ...newDocument, [field]: publicUrl })
                    }
                }
            } else {
                alert('Ошибка загрузки файла')
            }
        } catch (error) {
            console.error('Ошибка загрузки файла:', error)
            alert('Ошибка загрузки файла')
        } finally {
            setUploading(prev => ({ ...prev, [uploadKey]: false }))
        }
    }

    const handleAddDocument = async () => {
        try {
            const documentData = {
                ...newDocument,
                price_rub: parseInt(newDocument.price_rub),
                page_count: parseInt(newDocument.page_count) || 0,
                course_duration_minutes: parseInt(newDocument.course_duration_minutes) || 0,
                video_count: parseInt(newDocument.video_count) || 0,
                video_urls: newDocument.video_urls.filter(url => url.trim() !== '')
            }

            const response = await fetch('/api/admin/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(documentData),
            })

            if (response.ok) {
                const data = await response.json()
                setDocuments([data.document, ...documents])
                setNewDocument({
                    title: '',
                    description: '',
                    course_description: '',
                    main_pdf_title: '',
                    main_pdf_description: '',
                    price_rub: '',
                    course_type: 'mini_course',
                    file_url: '',
                    cover_url: '',
                    page_count: '',
                    video_urls: ['', '', ''],
                    audio_url: '',
                    video_preview_url: '',
                    course_duration_minutes: '',
                    video_count: '3',
                    has_workbook: true,
                    has_audio: true,
                    has_videos: true
                })
                setIsAddDialogOpen(false)
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка добавления документа:', error)
            alert('Ошибка добавления документа')
        }
    }

    const handleUpdateDocument = async (document: Document) => {
        try {
            const response = await fetch(`/api/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(document),
            })

            if (response.ok) {
                const data = await response.json()
                setDocuments(documents.map(doc =>
                    doc.id === document.id ? data.document : doc
                ))
                setEditingDocument(null)
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка обновления документа:', error)
            alert('Ошибка обновления документа')
        }
    }

    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот курс?')) {
            return
        }

        try {
            const response = await fetch(`/api/admin/documents/${id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                setDocuments(documents.filter(doc => doc.id !== id))
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка удаления документа:', error)
            alert('Ошибка удаления документа')
        }
    }

    const handleQuickAddWorkbook = async (document: Document) => {
        try {
            const response = await fetch('/api/admin/workbooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    document_id: document.id,
                    title: `Рабочая тетрадь ${(document.workbook_count || 0) + 1}`,
                    description: 'Автоматически созданная рабочая тетрадь',
                    file_url: 'https://placeholder.com/workbook.pdf', // Временный URL-заглушка
                    order_index: (document.workbook_count || 0) + 1
                }),
            })

            if (response.ok) {
                const data = await response.json()
                // Обновляем локальное состояние
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? { ...doc, workbook_count: (doc.workbook_count || 0) + 1 }
                        : doc
                ))
                alert('Рабочая тетрадь добавлена! Не забудьте загрузить файл через кнопку 📚.')
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка добавления рабочей тетради:', error)
            alert('Ошибка добавления рабочей тетради')
        }
    }

    const handleQuickRemoveWorkbook = async (document: Document) => {
        if (!confirm('Вы уверены, что хотите удалить последнюю рабочую тетрадь?')) {
            return
        }

        try {
            // Сначала получаем список рабочих тетрадей
            const workbooksResponse = await fetch(`/api/admin/workbooks?documentId=${document.id}`)
            if (!workbooksResponse.ok) {
                throw new Error('Не удалось получить список рабочих тетрадей')
            }

            const workbooksData = await workbooksResponse.json()
            const workbooks = workbooksData.workbooks || []

            if (workbooks.length === 0) {
                alert('Нет рабочих тетрадей для удаления')
                return
            }

            // Находим последнюю рабочую тетрадь (с максимальным order_index)
            const lastWorkbook = workbooks.reduce((prev: any, current: any) =>
                (prev.order_index > current.order_index) ? prev : current
            )

            // Удаляем последнюю рабочую тетрадь
            const deleteResponse = await fetch(`/api/admin/workbooks?id=${lastWorkbook.id}`, {
                method: 'DELETE',
            })

            if (deleteResponse.ok) {
                // Обновляем локальное состояние
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? { ...doc, workbook_count: Math.max((doc.workbook_count || 0) - 1, 0) }
                        : doc
                ))
                alert('Рабочая тетрадь удалена!')
            } else {
                const error = await deleteResponse.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка удаления рабочей тетради:', error)
            alert('Ошибка удаления рабочей тетради')
        }
    }

    const handleEnableWorkbooks = async (document: Document) => {
        try {
            // Сначала включаем рабочие тетради для курса
            const updateResponse = await fetch(`/api/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    has_workbook: true
                }),
            })

            if (!updateResponse.ok) {
                throw new Error('Не удалось включить рабочие тетради для курса')
            }

            // Затем создаем первую рабочую тетрадь
            const workbookResponse = await fetch('/api/admin/workbooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    document_id: document.id,
                    title: 'Рабочая тетрадь 1',
                    description: 'Первая рабочая тетрадь курса',
                    file_url: 'https://placeholder.com/workbook.pdf', // Временный URL-заглушка
                    order_index: 1
                }),
            })

            if (workbookResponse.ok) {
                // Обновляем локальное состояние
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? {
                            ...doc,
                            has_workbook: true,
                            workbook_count: 1
                        }
                        : doc
                ))
                alert('Рабочие тетради включены! Добавлена первая тетрадь. Не забудьте загрузить файл через кнопку 📚.')
            } else {
                const error = await workbookResponse.json()
                alert(`Ошибка создания первой тетради: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка включения рабочих тетрадей:', error)
            alert('Ошибка включения рабочих тетрадей')
        }
    }

    // Функции для управления видео
    const handleQuickAddVideo = async (document: Document) => {
        try {
            const currentVideos = document.video_urls || []
            const newVideoUrl = 'https://placeholder.com/video.mp4'
            const updatedVideos = [...currentVideos, newVideoUrl]

            const response = await fetch(`/api/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_urls: updatedVideos,
                    video_count: updatedVideos.length,
                    has_videos: true
                }),
            })

            if (response.ok) {
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? {
                            ...doc,
                            video_urls: updatedVideos,
                            video_count: updatedVideos.length,
                            has_videos: true
                        }
                        : doc
                ))
                alert(`Видео добавлено! Теперь ${updatedVideos.length} видео. Не забудьте загрузить файл.`)
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка добавления видео:', error)
            alert('Ошибка добавления видео')
        }
    }

    const handleQuickRemoveVideo = async (document: Document) => {
        if (!confirm('Вы уверены, что хотите удалить последнее видео?')) {
            return
        }

        try {
            const currentVideos = document.video_urls || []
            if (currentVideos.length === 0) {
                alert('Нет видео для удаления')
                return
            }

            const updatedVideos = currentVideos.slice(0, -1) // Удаляем последнее видео

            const response = await fetch(`/api/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_urls: updatedVideos,
                    video_count: updatedVideos.length,
                    has_videos: updatedVideos.length > 0
                }),
            })

            if (response.ok) {
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? {
                            ...doc,
                            video_urls: updatedVideos,
                            video_count: updatedVideos.length,
                            has_videos: updatedVideos.length > 0
                        }
                        : doc
                ))
                alert('Видео удалено!')
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка удаления видео:', error)
            alert('Ошибка удаления видео')
        }
    }

    const handleEnableVideos = async (document: Document) => {
        try {
            const response = await fetch(`/api/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_urls: ['https://placeholder.com/video.mp4'],
                    video_count: 1,
                    has_videos: true
                }),
            })

            if (response.ok) {
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? {
                            ...doc,
                            video_urls: ['https://placeholder.com/video.mp4'],
                            video_count: 1,
                            has_videos: true
                        }
                        : doc
                ))
                alert('Видео включено! Добавлено первое видео. Не забудьте загрузить файл.')
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка включения видео:', error)
            alert('Ошибка включения видео')
        }
    }

    // Функции для управления аудио
    const handleEnableAudio = async (document: Document) => {
        try {
            const response = await fetch(`/api/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_url: 'https://placeholder.com/audio.mp3',
                    has_audio: true
                }),
            })

            if (response.ok) {
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? {
                            ...doc,
                            audio_url: 'https://placeholder.com/audio.mp3',
                            has_audio: true
                        }
                        : doc
                ))
                alert('Аудио включено! Не забудьте загрузить файл.')
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка включения аудио:', error)
            alert('Ошибка включения аудио')
        }
    }

    const handleDisableAudio = async (document: Document) => {
        if (!confirm('Вы уверены, что хотите отключить аудио?')) {
            return
        }

        try {
            const response = await fetch(`/api/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_url: null,
                    has_audio: false
                }),
            })

            if (response.ok) {
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? {
                            ...doc,
                            audio_url: undefined,
                            has_audio: false
                        } as Document
                        : doc
                ))
                alert('Аудио отключено!')
            } else {
                const error = await response.json()
                alert(`Ошибка: ${error.error}`)
            }
        } catch (error) {
            console.error('Ошибка отключения аудио:', error)
            alert('Ошибка отключения аудио')
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ru-RU').format(price) + ' ₽'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU')
    }

    const getCourseTypeIcon = (type: string) => {
        return type === 'mini_course' ? <Video className="w-4 h-4 text-purple-600" /> : <FileText className="w-4 h-4 text-blue-600" />
    }

    const getCourseTypeLabel = (type: string) => {
        return type === 'mini_course' ? 'Мини-курс' : 'PDF'
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Управление курсами</h2>
                    <p className="text-gray-600">Создавайте и редактируйте курсы</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить курс
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Добавить новый курс</DialogTitle>
                            <DialogDescription>
                                Заполните информацию о новом курсе
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Основная информация */}
                            <div className="grid gap-2">
                                <Label htmlFor="title">Название *</Label>
                                <Input
                                    id="title"
                                    value={newDocument.title}
                                    onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                                    placeholder="Название курса"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Описание курса</Label>
                                <Textarea
                                    id="description"
                                    value={newDocument.description}
                                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                    placeholder="Описание курса"
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="course_description">Подробное описание курса</Label>
                                <Textarea
                                    id="course_description"
                                    value={newDocument.course_description || ''}
                                    onChange={(e) => setNewDocument({ ...newDocument, course_description: e.target.value })}
                                    placeholder="Подробное описание курса для страницы предпросмотра"
                                    rows={4}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="main_pdf_title">Название главного PDF</Label>
                                <Input
                                    id="main_pdf_title"
                                    value={newDocument.main_pdf_title || ''}
                                    onChange={(e) => setNewDocument({ ...newDocument, main_pdf_title: e.target.value })}
                                    placeholder="Название главного PDF файла"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="main_pdf_description">Описание главного PDF</Label>
                                <Textarea
                                    id="main_pdf_description"
                                    value={newDocument.main_pdf_description || ''}
                                    onChange={(e) => setNewDocument({ ...newDocument, main_pdf_description: e.target.value })}
                                    placeholder="Описание главного PDF файла"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="course_type">Тип курса</Label>
                                    <select
                                        id="course_type"
                                        value={newDocument.course_type}
                                        onChange={(e) => setNewDocument({ ...newDocument, course_type: e.target.value as 'pdf' | 'mini_course' })}
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
                                        value={newDocument.price_rub}
                                        onChange={(e) => setNewDocument({ ...newDocument, price_rub: e.target.value })}
                                        placeholder="2990"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="page_count">Количество страниц</Label>
                                    <Input
                                        id="page_count"
                                        type="number"
                                        value={newDocument.page_count}
                                        onChange={(e) => setNewDocument({ ...newDocument, page_count: e.target.value })}
                                        placeholder="45"
                                    />
                                </div>
                            </div>

                            {/* Файлы курса */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Файлы курса</h3>

                                {/* Обложка */}
                                <div className="grid gap-2">
                                    <Label>Обложка курса</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.cover_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, cover_url: e.target.value })}
                                            placeholder="URL обложки"
                                        />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(newDocument.title)}/cover.png`, 'cover_url')
                                                }
                                            }}
                                            className="hidden"
                                            id="cover-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('cover-upload')?.click()}
                                            disabled={uploading[`new_cover_url`]}
                                        >
                                            {uploading[`new_cover_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Основной PDF */}
                                <div className="grid gap-2">
                                    <Label>Основной PDF</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.file_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, file_url: e.target.value })}
                                            placeholder="URL основного PDF"
                                        />
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(newDocument.title)}/main.pdf`, 'file_url')
                                                }
                                            }}
                                            className="hidden"
                                            id="pdf-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('pdf-upload')?.click()}
                                            disabled={uploading[`new_file_url`]}
                                        >
                                            {uploading[`new_file_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Превью видео */}
                                <div className="grid gap-2">
                                    <Label>Превью видео</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.video_preview_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, video_preview_url: e.target.value })}
                                            placeholder="URL превью видео"
                                        />
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(newDocument.title)}/preview/preview.mp4`, 'video_preview_url')
                                                }
                                            }}
                                            className="hidden"
                                            id="preview-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('preview-upload')?.click()}
                                            disabled={uploading[`new_video_preview_url`]}
                                        >
                                            {uploading[`new_video_preview_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Рабочие тетради управляются через иконку книги 📚 в списке курсов */}

                                {/* Аудио */}
                                <div className="grid gap-2">
                                    <Label>Аудио-настройка</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.audio_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, audio_url: e.target.value })}
                                            placeholder="URL аудио файла"
                                        />
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(newDocument.title)}/audio.mp3`, 'audio_url')
                                                }
                                            }}
                                            className="hidden"
                                            id="audio-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('audio-upload')?.click()}
                                            disabled={uploading[`new_audio_url`]}
                                        >
                                            {uploading[`new_audio_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Видео уроки */}
                                <div className="grid gap-2">
                                    <Label>Видео уроки</Label>
                                    {newDocument.video_urls.map((url, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={url}
                                                onChange={(e) => {
                                                    const newVideoUrls = [...newDocument.video_urls]
                                                    newVideoUrls[index] = e.target.value
                                                    setNewDocument({ ...newDocument, video_urls: newVideoUrls })
                                                }}
                                                placeholder={`URL видео урока ${index + 1}`}
                                            />
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        handleFileUpload(file, `courses/${generateSlug(newDocument.title)}/videos/video${index + 1}.mp4`, 'video_urls')
                                                    }
                                                }}
                                                className="hidden"
                                                id={`video-upload-${index}`}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById(`video-upload-${index}`)?.click()}
                                                disabled={uploading[`new_video_urls`]}
                                            >
                                                {uploading[`new_video_urls`] ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                ) : (
                                                    <Upload className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {/* Дополнительные настройки */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="course_duration_minutes">Продолжительность (минуты)</Label>
                                        <Input
                                            id="course_duration_minutes"
                                            type="number"
                                            value={newDocument.course_duration_minutes}
                                            onChange={(e) => setNewDocument({ ...newDocument, course_duration_minutes: e.target.value })}
                                            placeholder="25"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="video_count">Количество видео</Label>
                                        <Input
                                            id="video_count"
                                            type="number"
                                            value={newDocument.video_count}
                                            onChange={(e) => setNewDocument({ ...newDocument, video_count: e.target.value })}
                                            placeholder="3"
                                        />
                                    </div>
                                </div>

                                {/* Чекбоксы */}
                                <div className="grid grid-cols-3 gap-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={newDocument.has_workbook}
                                            onChange={(e) => setNewDocument({ ...newDocument, has_workbook: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Есть рабочая тетрадь</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={newDocument.has_audio}
                                            onChange={(e) => setNewDocument({ ...newDocument, has_audio: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Есть аудио</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={newDocument.has_videos}
                                            onChange={(e) => setNewDocument({ ...newDocument, has_videos: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Есть видео</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Отмена
                            </Button>
                            <Button onClick={handleAddDocument}>
                                <Save className="h-4 w-4 mr-2" />
                                Сохранить
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Список курсов ({documents.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Название</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Цена</TableHead>
                                <TableHead>Материалы</TableHead>
                                <TableHead>Создан</TableHead>
                                <TableHead>Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((document) => (
                                <TableRow key={document.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{document.title}</div>
                                            {document.description && (
                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                    {document.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getCourseTypeIcon(document.course_type || 'pdf')}
                                            <span className="text-sm">{getCourseTypeLabel(document.course_type || 'pdf')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-green-600">
                                            {formatPrice(document.price_rub)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {document.cover_url && <Image className="w-4 h-4 text-blue-500" />}
                                                {document.file_url && <File className="w-4 h-4 text-green-500" />}
                                                {document.video_preview_url && <Play className="w-4 h-4 text-purple-500" />}
                                                {document.workbook_url && <BookOpen className="w-4 h-4 text-orange-500" />}
                                                {document.audio_url && <Volume2 className="w-4 h-4 text-red-500" />}
                                                {document.video_urls && document.video_urls.length > 0 && <Video className="w-4 h-4 text-indigo-500" />}
                                            </div>
                                            {/* Рабочие тетради */}
                                            {document.has_workbook ? (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-500">
                                                        {document.workbook_count || 0} тетрадей
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickAddWorkbook(document)}
                                                            className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                                                            title="Добавить тетрадь"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickRemoveWorkbook(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Удалить последнюю тетрадь"
                                                            disabled={!document.workbook_count || document.workbook_count <= 0}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-400">Нет тетрадей</span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEnableWorkbooks(document)}
                                                        className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700"
                                                        title="Включить рабочие тетради"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Видео */}
                                            {document.has_videos ? (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-500">
                                                        {document.video_count || 0} видео
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickAddVideo(document)}
                                                            className="h-5 w-5 p-0 text-indigo-600 hover:text-indigo-700"
                                                            title="Добавить видео"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickRemoveVideo(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Удалить последнее видео"
                                                            disabled={!document.video_count || document.video_count <= 0}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-400">Нет видео</span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEnableVideos(document)}
                                                        className="h-5 w-5 p-0 text-indigo-600 hover:text-indigo-700"
                                                        title="Включить видео"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Аудио */}
                                            <div className="flex items-center gap-1 ml-2">
                                                {document.has_audio ? (
                                                    <>
                                                        <span className="text-xs text-gray-500">Есть аудио</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDisableAudio(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Отключить аудио"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-xs text-gray-400">Нет аудио</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEnableAudio(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Включить аудио"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatDate(document.created_at)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingDocument(document)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedDocumentForWorkbooks(document)
                                                    setShowWorkbooksManager(true)
                                                }}
                                                className="text-blue-600 hover:text-blue-700"
                                            >
                                                <BookOpen className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteDocument(document.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Диалог редактирования */}
            {editingDocument && (
                <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Редактировать курс</DialogTitle>
                            <DialogDescription>
                                Измените информацию о курсе
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Основная информация */}
                            <div className="grid gap-2">
                                <Label htmlFor="edit-title">Название</Label>
                                <Input
                                    id="edit-title"
                                    value={editingDocument.title}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, title: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Описание курса</Label>
                                <Textarea
                                    id="edit-description"
                                    value={editingDocument.description}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-course_description">Подробное описание курса</Label>
                                <Textarea
                                    id="edit-course_description"
                                    value={editingDocument.course_description || ''}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, course_description: e.target.value })}
                                    placeholder="Подробное описание курса для страницы предпросмотра"
                                    rows={4}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-main_pdf_title">Название главного PDF</Label>
                                <Input
                                    id="edit-main_pdf_title"
                                    value={editingDocument.main_pdf_title || ''}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, main_pdf_title: e.target.value })}
                                    placeholder="Название главного PDF файла"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-main_pdf_description">Описание главного PDF</Label>
                                <Textarea
                                    id="edit-main_pdf_description"
                                    value={editingDocument.main_pdf_description || ''}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, main_pdf_description: e.target.value })}
                                    placeholder="Описание главного PDF файла"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-course_type">Тип курса</Label>
                                    <select
                                        id="edit-course_type"
                                        value={editingDocument.course_type || 'pdf'}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, course_type: e.target.value as 'pdf' | 'mini_course' })}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="mini_course">Мини-курс</option>
                                        <option value="pdf">PDF</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-price_rub">Цена (₽)</Label>
                                    <Input
                                        id="edit-price_rub"
                                        type="number"
                                        value={editingDocument.price_rub}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, price_rub: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-page_count">Количество страниц</Label>
                                    <Input
                                        id="edit-page_count"
                                        type="number"
                                        value={(editingDocument as any).page_count || 0}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, page_count: parseInt(e.target.value) } as any)}
                                    />
                                </div>
                            </div>

                            {/* Файлы курса */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Файлы курса</h3>

                                {/* Обложка */}
                                <div className="grid gap-2">
                                    <Label>Обложка курса</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.cover_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, cover_url: e.target.value })}
                                            placeholder="URL обложки"
                                        />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(editingDocument.title)}/cover.png`, 'cover_url', editingDocument.id)
                                                }
                                            }}
                                            className="hidden"
                                            id="edit-cover-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('edit-cover-upload')?.click()}
                                            disabled={uploading[`${editingDocument.id}_cover_url`]}
                                        >
                                            {uploading[`${editingDocument.id}_cover_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Основной PDF */}
                                <div className="grid gap-2">
                                    <Label>Основной PDF</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.file_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, file_url: e.target.value })}
                                            placeholder="URL основного PDF"
                                        />
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(editingDocument.title)}/main.pdf`, 'file_url', editingDocument.id)
                                                }
                                            }}
                                            className="hidden"
                                            id="edit-pdf-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('edit-pdf-upload')?.click()}
                                            disabled={uploading[`${editingDocument.id}_file_url`]}
                                        >
                                            {uploading[`${editingDocument.id}_file_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Превью видео */}
                                <div className="grid gap-2">
                                    <Label>Превью видео</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.video_preview_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, video_preview_url: e.target.value })}
                                            placeholder="URL превью видео"
                                        />
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(editingDocument.title)}/preview/preview.mp4`, 'video_preview_url', editingDocument.id)
                                                }
                                            }}
                                            className="hidden"
                                            id="edit-preview-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('edit-preview-upload')?.click()}
                                            disabled={uploading[`${editingDocument.id}_video_preview_url`]}
                                        >
                                            {uploading[`${editingDocument.id}_video_preview_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Рабочие тетради управляются через иконку книги 📚 в списке курсов */}

                                {/* Аудио */}
                                <div className="grid gap-2">
                                    <Label>Аудио-настройка</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.audio_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, audio_url: e.target.value })}
                                            placeholder="URL аудио файла"
                                        />
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${generateSlug(editingDocument.title)}/audio.mp3`, 'audio_url', editingDocument.id)
                                                }
                                            }}
                                            className="hidden"
                                            id="edit-audio-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('edit-audio-upload')?.click()}
                                            disabled={uploading[`${editingDocument.id}_audio_url`]}
                                        >
                                            {uploading[`${editingDocument.id}_audio_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Видео уроки */}
                                <div className="grid gap-2">
                                    <Label>Видео уроки</Label>
                                    {(editingDocument.video_urls || ['', '', '']).map((url, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={url || ''}
                                                onChange={(e) => {
                                                    const newVideoUrls = [...(editingDocument.video_urls || ['', '', ''])]
                                                    newVideoUrls[index] = e.target.value
                                                    setEditingDocument({ ...editingDocument, video_urls: newVideoUrls })
                                                }}
                                                placeholder={`URL видео урока ${index + 1}`}
                                            />
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        handleFileUpload(file, `courses/${generateSlug(editingDocument.title)}/videos/video${index + 1}.mp4`, 'video_urls', editingDocument.id)
                                                    }
                                                }}
                                                className="hidden"
                                                id={`edit-video-upload-${index}`}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById(`edit-video-upload-${index}`)?.click()}
                                                disabled={uploading[`${editingDocument.id}_video_urls`]}
                                            >
                                                {uploading[`${editingDocument.id}_video_urls`] ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                ) : (
                                                    <Upload className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {/* Дополнительные настройки */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-course_duration_minutes">Продолжительность (минуты)</Label>
                                        <Input
                                            id="edit-course_duration_minutes"
                                            type="number"
                                            value={editingDocument.course_duration_minutes || 0}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, course_duration_minutes: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-video_count">Количество видео</Label>
                                        <Input
                                            id="edit-video_count"
                                            type="number"
                                            value={editingDocument.video_count || 0}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, video_count: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                {/* Чекбоксы */}
                                <div className="grid grid-cols-3 gap-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={editingDocument.has_workbook || false}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, has_workbook: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Есть рабочая тетрадь</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={editingDocument.has_audio || false}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, has_audio: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Есть аудио</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={editingDocument.has_videos || false}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, has_videos: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Есть видео</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingDocument(null)}>
                                Отмена
                            </Button>
                            <Button onClick={() => handleUpdateDocument(editingDocument)}>
                                <Save className="h-4 w-4 mr-2" />
                                Сохранить
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Модальное окно управления рабочими тетрадями */}
            {showWorkbooksManager && selectedDocumentForWorkbooks && (
                <Dialog open={showWorkbooksManager} onOpenChange={setShowWorkbooksManager}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Управление рабочими тетрадями: {selectedDocumentForWorkbooks.title}
                            </DialogTitle>
                            <DialogDescription>
                                Добавляйте, редактируйте и упорядочивайте рабочие тетради для курса
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <WorkbooksManager
                                documentId={selectedDocumentForWorkbooks.id}
                                documentTitle={selectedDocumentForWorkbooks.title}
                                onWorkbooksChange={(count) => {
                                    // Обновляем количество рабочих тетрадей в списке курсов
                                    setDocuments(documents.map(doc =>
                                        doc.id === selectedDocumentForWorkbooks.id
                                            ? { ...doc, workbook_count: count }
                                            : doc
                                    ))
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowWorkbooksManager(false)}>
                                Закрыть
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
