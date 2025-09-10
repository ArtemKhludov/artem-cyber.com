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

export function CoursesManagement() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingDocument, setEditingDocument] = useState<Document | null>(null)
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
    const [activeModalTab, setActiveModalTab] = useState<'basic' | 'files' | 'settings'>('basic')

    const [newDocument, setNewDocument] = useState<CourseFormData>({
        title: '',
        description: '',
        price_rub: '',
        course_type: 'mini_course',
        file_url: '',
        cover_url: '',
        page_count: '',
        workbook_url: '',
        video_urls: ['', '', ''],
        audio_url: '',
        video_preview_url: '',
        course_duration_minutes: '',
        video_count: '3',
        has_workbook: true,
        has_audio: true,
        has_videos: true
    })

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
                    price_rub: '',
                    course_type: 'mini_course',
                    file_url: '',
                    cover_url: '',
                    page_count: '',
                    workbook_url: '',
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
                    <p className="text-gray-600">Создавайте и редактируйте мини-курсы и PDF документы</p>
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
                                <Label htmlFor="description">Описание</Label>
                                <Textarea
                                    id="description"
                                    value={newDocument.description}
                                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                    placeholder="Описание курса"
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
                                                    handleFileUpload(file, `courses/${newDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/cover.png`, 'cover_url')
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
                                                    handleFileUpload(file, `courses/${newDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/main.pdf`, 'file_url')
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
                                                    handleFileUpload(file, `courses/${newDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/preview.mp4`, 'video_preview_url')
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

                                {/* Рабочая тетрадь */}
                                <div className="grid gap-2">
                                    <Label>Рабочая тетрадь</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.workbook_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, workbook_url: e.target.value })}
                                            placeholder="URL рабочей тетради"
                                        />
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${newDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/workbook.pdf`, 'workbook_url')
                                                }
                                            }}
                                            className="hidden"
                                            id="workbook-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('workbook-upload')?.click()}
                                            disabled={uploading[`new_workbook_url`]}
                                        >
                                            {uploading[`new_workbook_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

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
                                                    handleFileUpload(file, `courses/${newDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/audio.mp3`, 'audio_url')
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
                                                        handleFileUpload(file, `courses/${newDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/videos/video${index + 1}.mp4`, 'video_urls')
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
                                        <div className="flex gap-1">
                                            {document.cover_url && <Image className="w-4 h-4 text-blue-500" title="Обложка" />}
                                            {document.file_url && <File className="w-4 h-4 text-green-500" title="PDF" />}
                                            {document.video_preview_url && <Play className="w-4 h-4 text-purple-500" title="Превью" />}
                                            {document.workbook_url && <BookOpen className="w-4 h-4 text-orange-500" title="Тетрадь" />}
                                            {document.audio_url && <Volume2 className="w-4 h-4 text-red-500" title="Аудио" />}
                                            {document.video_urls && document.video_urls.length > 0 && <Video className="w-4 h-4 text-indigo-500" title="Видео" />}
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
                                <Label htmlFor="edit-description">Описание</Label>
                                <Textarea
                                    id="edit-description"
                                    value={editingDocument.description}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })}
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
                                        value={editingDocument.page_count || 0}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, page_count: parseInt(e.target.value) })}
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
                                                    handleFileUpload(file, `courses/${editingDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/cover.png`, 'cover_url', editingDocument.id)
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
                                                    handleFileUpload(file, `courses/${editingDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/main.pdf`, 'file_url', editingDocument.id)
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
                                                    handleFileUpload(file, `courses/${editingDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/preview.mp4`, 'video_preview_url', editingDocument.id)
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

                                {/* Рабочая тетрадь */}
                                <div className="grid gap-2">
                                    <Label>Рабочая тетрадь</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.workbook_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, workbook_url: e.target.value })}
                                            placeholder="URL рабочей тетради"
                                        />
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleFileUpload(file, `courses/${editingDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/workbook.pdf`, 'workbook_url', editingDocument.id)
                                                }
                                            }}
                                            className="hidden"
                                            id="edit-workbook-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('edit-workbook-upload')?.click()}
                                            disabled={uploading[`${editingDocument.id}_workbook_url`]}
                                        >
                                            {uploading[`${editingDocument.id}_workbook_url`] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

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
                                                    handleFileUpload(file, `courses/${editingDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/audio.mp3`, 'audio_url', editingDocument.id)
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
                                                        handleFileUpload(file, `courses/${editingDocument.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}/videos/video${index + 1}.mp4`, 'video_urls', editingDocument.id)
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
        </div>
    )
}
