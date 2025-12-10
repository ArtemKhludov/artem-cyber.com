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

    // Function to generate correct slug from course title
    const generateSlug = (title: string): string => {
        if (!title) return 'untitled'

        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove everything except letters, numbers and spaces
            .replace(/\s+/g, '-')        // Replace spaces with hyphens
            .replace(/-+/g, '-')         // Remove multiple hyphens
            .replace(/^-|-$/g, '') || 'untitled' // Remove hyphens at start and end
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
                console.error('Error loading documents')
            }
        } catch (error) {
            console.error('Error loading documents:', error)
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
                    // Update existing document
                    const updatedDocument = { ...editingDocument, [field]: publicUrl }
                    setEditingDocument(updatedDocument)
                } else {
                    // Update new document form
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
                alert('Error uploading file')
            }
        } catch (error) {
            console.error('Error uploading file:', error)
            alert('Error uploading file')
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
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error adding document:', error)
            alert('Error adding document')
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
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating document:', error)
            alert('Error updating document')
        }
    }

    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Are you sure you want to delete this course?')) {
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
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting document:', error)
            alert('Error deleting document')
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
                    title: `Workbook ${(document.workbook_count || 0) + 1}`,
                    description: 'Auto-generated workbook',
                    file_url: '',
                    order_index: (document.workbook_count || 0) + 1
                }),
            })

            if (response.ok) {
                const data = await response.json()
                // Update local state
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? { ...doc, workbook_count: (doc.workbook_count || 0) + 1 }
                        : doc
                ))
                alert('Workbook added! Don\'t forget to upload the file via the 📚 button.')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error adding workbook:', error)
            alert('Error adding workbook')
        }
    }

    const handleQuickRemoveWorkbook = async (document: Document) => {
        if (!confirm('Are you sure you want to delete the last workbook?')) {
            return
        }

        try {
            // First get list of workbooks
            const workbooksResponse = await fetch(`/api/admin/workbooks?documentId=${document.id}`)
            if (!workbooksResponse.ok) {
                throw new Error('Failed to get workbook list')
            }

            const workbooksData = await workbooksResponse.json()
            const workbooks = workbooksData.workbooks || []

            if (workbooks.length === 0) {
                alert('No workbooks to delete')
                return
            }

            // Find last workbook (with maximum order_index)
            const lastWorkbook = workbooks.reduce((prev: any, current: any) =>
                (prev.order_index > current.order_index) ? prev : current
            )

            // Delete last workbook
            const deleteResponse = await fetch(`/api/admin/workbooks?id=${lastWorkbook.id}`, {
                method: 'DELETE',
            })

            if (deleteResponse.ok) {
                // Update local state
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? { ...doc, workbook_count: Math.max((doc.workbook_count || 0) - 1, 0) }
                        : doc
                ))
                alert('Workbook deleted!')
            } else {
                const error = await deleteResponse.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting workbook:', error)
            alert('Error deleting workbook')
        }
    }

    const handleEnableWorkbooks = async (document: Document) => {
        try {
            // First enable workbooks for the course
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
                throw new Error('Failed to enable workbooks for the course')
            }

            // Then create the first workbook
            const workbookResponse = await fetch('/api/admin/workbooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    document_id: document.id,
                    title: 'Workbook 1',
                    description: 'First course workbook',
                    file_url: '',
                    order_index: 1
                }),
            })

            if (workbookResponse.ok) {
                // Update local state
                setDocuments(documents.map(doc =>
                    doc.id === document.id
                        ? {
                            ...doc,
                            has_workbook: true,
                            workbook_count: 1
                        }
                        : doc
                ))
                alert('Workbooks enabled! First workbook added. Don\'t forget to upload the file via the 📚 button.')
            } else {
                const error = await workbookResponse.json()
                alert(`Error creating first workbook: ${error.error}`)
            }
        } catch (error) {
            console.error('Error enabling workbooks:', error)
            alert('Error enabling workbooks')
        }
    }

    // Functions for video management
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
                alert(`Video added! Now ${updatedVideos.length} videos. Do not forget to upload the file.`)
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error adding video:', error)
            alert('Error adding video')
        }
    }

    const handleQuickRemoveVideo = async (document: Document) => {
        if (!confirm('Are you sure you want to delete the last video?')) {
            return
        }

        try {
            const currentVideos = document.video_urls || []
            if (currentVideos.length === 0) {
                alert('No videos to delete')
                return
            }

            const updatedVideos = currentVideos.slice(0, -1) // Remove last video

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
                alert('Video deleted!')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting video:', error)
            alert('Error deleting video')
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
                alert('Videos enabled! First video added. Don\'t forget to upload the file.')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error enabling videos:', error)
            alert('Error enabling videos')
        }
    }

    // Functions for audio management
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
                alert('Audio enabled! Don\'t forget to upload the file.')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error enabling audio:', error)
            alert('Error enabling audio')
        }
    }

    const handleDisableAudio = async (document: Document) => {
        if (!confirm('Are you sure you want to disable audio?')) {
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
                alert('Audio disabled!')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error disabling audio:', error)
            alert('Error disabling audio')
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US').format(price) + ' $'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US')
    }

    const getCourseTypeIcon = (type: string) => {
        return type === 'mini_course' ? <Video className="w-4 h-4 text-purple-600" /> : <FileText className="w-4 h-4 text-blue-600" />
    }

    const getCourseTypeLabel = (type: string) => {
        return type === 'mini_course' ? 'Mini Course' : 'PDF'
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
                    <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
                    <p className="text-gray-600">Create and edit courses</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Course
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Course</DialogTitle>
                            <DialogDescription>
                                Fill in information about the new course
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Basic Information */}
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={newDocument.title}
                                    onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                                    placeholder="Course title"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Course Description</Label>
                                <Textarea
                                    id="description"
                                    value={newDocument.description}
                                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                    placeholder="Course description"
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="course_description">Detailed Course Description</Label>
                                <Textarea
                                    id="course_description"
                                    value={newDocument.course_description || ''}
                                    onChange={(e) => setNewDocument({ ...newDocument, course_description: e.target.value })}
                                    placeholder="Detailed course description for preview page"
                                    rows={4}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="main_pdf_title">Main PDF Title</Label>
                                <Input
                                    id="main_pdf_title"
                                    value={newDocument.main_pdf_title || ''}
                                    onChange={(e) => setNewDocument({ ...newDocument, main_pdf_title: e.target.value })}
                                    placeholder="Main PDF file title"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="main_pdf_description">Main PDF Description</Label>
                                <Textarea
                                    id="main_pdf_description"
                                    value={newDocument.main_pdf_description || ''}
                                    onChange={(e) => setNewDocument({ ...newDocument, main_pdf_description: e.target.value })}
                                    placeholder="Main PDF file description"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="course_type">Course Type</Label>
                                    <select
                                        id="course_type"
                                        value={newDocument.course_type}
                                        onChange={(e) => setNewDocument({ ...newDocument, course_type: e.target.value as 'pdf' | 'mini_course' })}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="mini_course">Mini Course</option>
                                        <option value="pdf">PDF</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="price_rub">Price ($) *</Label>
                                    <Input
                                        id="price_rub"
                                        type="number"
                                        value={newDocument.price_rub}
                                        onChange={(e) => setNewDocument({ ...newDocument, price_rub: e.target.value })}
                                        placeholder="29.90"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="page_count">Page Count</Label>
                                    <Input
                                        id="page_count"
                                        type="number"
                                        value={newDocument.page_count}
                                        onChange={(e) => setNewDocument({ ...newDocument, page_count: e.target.value })}
                                        placeholder="45"
                                    />
                                </div>
                            </div>

                            {/* Course Files */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Course Files</h3>

                                {/* Cover */}
                                <div className="grid gap-2">
                                    <Label>Course Cover</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.cover_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, cover_url: e.target.value })}
                                            placeholder="Cover URL"
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

                                {/* Main PDF */}
                                <div className="grid gap-2">
                                    <Label>Main PDF</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.file_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, file_url: e.target.value })}
                                            placeholder="Main PDF URL"
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

                                {/* Video Preview */}
                                <div className="grid gap-2">
                                    <Label>Video Preview</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.video_preview_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, video_preview_url: e.target.value })}
                                            placeholder="Video preview URL"
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

                                {/* Workbooks are managed via the 📚 icon in the course list */}

                                {/* Audio */}
                                <div className="grid gap-2">
                                    <Label>Audio Adjustment</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newDocument.audio_url}
                                            onChange={(e) => setNewDocument({ ...newDocument, audio_url: e.target.value })}
                                            placeholder="Audio file URL"
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

                                {/* Video Lessons */}
                                <div className="grid gap-2">
                                    <Label>Video Lessons</Label>
                                    {newDocument.video_urls.map((url, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={url}
                                                onChange={(e) => {
                                                    const newVideoUrls = [...newDocument.video_urls]
                                                    newVideoUrls[index] = e.target.value
                                                    setNewDocument({ ...newDocument, video_urls: newVideoUrls })
                                                }}
                                                placeholder={`Video lesson ${index + 1} URL`}
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
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Course List ({documents.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Materials</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
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
                                            {/* Workbooks */}
                                            {document.has_workbook ? (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-500">
                                                        {document.workbook_count || 0} workbooks
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickAddWorkbook(document)}
                                                            className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                                                            title="Add Workbook"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickRemoveWorkbook(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Remove Last Workbook"
                                                            disabled={!document.workbook_count || document.workbook_count <= 0}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-400">No Workbooks</span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEnableWorkbooks(document)}
                                                        className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700"
                                                        title="Enable Workbooks"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Videos */}
                                            {document.has_videos ? (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-500">
                                                        {document.video_count || 0} videos
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickAddVideo(document)}
                                                            className="h-5 w-5 p-0 text-indigo-600 hover:text-indigo-700"
                                                            title="Add Video"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleQuickRemoveVideo(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Remove Last Video"
                                                            disabled={!document.video_count || document.video_count <= 0}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <span className="text-xs text-gray-400">No Videos</span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEnableVideos(document)}
                                                        className="h-5 w-5 p-0 text-indigo-600 hover:text-indigo-700"
                                                        title="Enable Videos"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Audio */}
                                            <div className="flex items-center gap-1 ml-2">
                                                {document.has_audio ? (
                                                    <>
                                                        <span className="text-xs text-gray-500">Has Audio</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDisableAudio(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Disable Audio"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-xs text-gray-400">No Audio</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEnableAudio(document)}
                                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                            title="Enable Audio"
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

            {/* Edit Dialog */}
            {editingDocument && (
                <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
                    <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Course</DialogTitle>
                            <DialogDescription>
                                Update course information
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Basic Information */}
                            <div className="grid gap-2">
                                <Label htmlFor="edit-title">Title</Label>
                                <Input
                                    id="edit-title"
                                    value={editingDocument.title}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, title: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Course Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={editingDocument.description}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-course_description">Detailed Course Description</Label>
                                <Textarea
                                    id="edit-course_description"
                                    value={editingDocument.course_description || ''}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, course_description: e.target.value })}
                                    placeholder="Detailed course description for preview page"
                                    rows={4}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-main_pdf_title">Main PDF Title</Label>
                                <Input
                                    id="edit-main_pdf_title"
                                    value={editingDocument.main_pdf_title || ''}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, main_pdf_title: e.target.value })}
                                    placeholder="Main PDF file title"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-main_pdf_description">Main PDF Description</Label>
                                <Textarea
                                    id="edit-main_pdf_description"
                                    value={editingDocument.main_pdf_description || ''}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, main_pdf_description: e.target.value })}
                                    placeholder="Main PDF file description"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-course_type">Course Type</Label>
                                    <select
                                        id="edit-course_type"
                                        value={editingDocument.course_type || 'pdf'}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, course_type: e.target.value as 'pdf' | 'mini_course' })}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="mini_course">Mini Course</option>
                                        <option value="pdf">PDF</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-price_rub">Price ($)</Label>
                                    <Input
                                        id="edit-price_rub"
                                        type="number"
                                        value={editingDocument.price_rub}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, price_rub: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-page_count">Page Count</Label>
                                    <Input
                                        id="edit-page_count"
                                        type="number"
                                        value={(editingDocument as any).page_count || 0}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, page_count: parseInt(e.target.value) } as any)}
                                    />
                                </div>
                            </div>

                            {/* Course Files */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Course Files</h3>

                                {/* Cover */}
                                <div className="grid gap-2">
                                    <Label>Course Cover</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.cover_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, cover_url: e.target.value })}
                                            placeholder="Cover URL"
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

                                {/* Main PDF */}
                                <div className="grid gap-2">
                                    <Label>Main PDF</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.file_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, file_url: e.target.value })}
                                            placeholder="Main PDF URL"
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

                                {/* Video Preview */}
                                <div className="grid gap-2">
                                    <Label>Video Preview</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.video_preview_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, video_preview_url: e.target.value })}
                                            placeholder="Video preview URL"
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

                                {/* Workbooks are managed via the 📚 icon in the course list */}

                                {/* Audio */}
                                <div className="grid gap-2">
                                    <Label>Audio Adjustment</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={editingDocument.audio_url || ''}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, audio_url: e.target.value })}
                                            placeholder="Audio file URL"
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

                                {/* Video Lessons */}
                                <div className="grid gap-2">
                                    <Label>Video Lessons</Label>
                                    {(editingDocument.video_urls || ['', '', '']).map((url, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={url || ''}
                                                onChange={(e) => {
                                                    const newVideoUrls = [...(editingDocument.video_urls || ['', '', ''])]
                                                    newVideoUrls[index] = e.target.value
                                                    setEditingDocument({ ...editingDocument, video_urls: newVideoUrls })
                                                }}
                                                placeholder={`Video lesson ${index + 1} URL`}
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

                                {/* Additional Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-course_duration_minutes">Duration (minutes)</Label>
                                        <Input
                                            id="edit-course_duration_minutes"
                                            type="number"
                                            value={editingDocument.course_duration_minutes || 0}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, course_duration_minutes: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-video_count">Number of Videos</Label>
                                        <Input
                                            id="edit-video_count"
                                            type="number"
                                            value={editingDocument.video_count || 0}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, video_count: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                {/* Checkboxes */}
                                <div className="grid grid-cols-3 gap-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={editingDocument.has_workbook || false}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, has_workbook: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Has Workbook</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={editingDocument.has_audio || false}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, has_audio: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Has Audio</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={editingDocument.has_videos || false}
                                            onChange={(e) => setEditingDocument({ ...editingDocument, has_videos: e.target.checked })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Has Videos</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingDocument(null)}>
                                Cancel
                            </Button>
                            <Button onClick={() => handleUpdateDocument(editingDocument)}>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Workbook Management Modal */}
            {showWorkbooksManager && selectedDocumentForWorkbooks && (
                <Dialog open={showWorkbooksManager} onOpenChange={setShowWorkbooksManager}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Workbook Management: {selectedDocumentForWorkbooks.title}
                            </DialogTitle>
                            <DialogDescription>
                                Add, edit, and organize workbooks for the course
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <WorkbooksManager
                                documentId={selectedDocumentForWorkbooks.id}
                                documentTitle={selectedDocumentForWorkbooks.title}
                                onWorkbooksChange={(count) => {
                                    // Update workbook count in course list
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
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
