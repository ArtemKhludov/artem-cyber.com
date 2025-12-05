'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
    Plus,
    Edit,
    Trash2,
    Save,
    Upload,
    BookOpen,
    ArrowUp,
    ArrowDown,
    Eye,
    EyeOff,
    PlayCircle,
    FileText
} from 'lucide-react'
import type { Workbook } from '@/types'

interface WorkbooksManagerProps {
    documentId: string
    documentTitle: string
    onWorkbooksChange?: (count: number) => void
}

export function WorkbooksManager({ documentId, documentTitle, onWorkbooksChange }: WorkbooksManagerProps) {
    const [workbooks, setWorkbooks] = useState<Workbook[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingWorkbook, setEditingWorkbook] = useState<Workbook | null>(null)
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})

    const [newWorkbook, setNewWorkbook] = useState({
        title: '',
        description: '',
        file_url: '',
        video_url: '',
        order_index: 0
    })

    useEffect(() => {
        loadWorkbooks()
    }, [documentId])

    const loadWorkbooks = async () => {
        try {
            const response = await fetch(`/api/admin/workbooks?documentId=${documentId}`)
            if (response.ok) {
                const data = await response.json()
                const workbooksList = data.workbooks || []
                setWorkbooks(workbooksList)
                // Notify parent component about quantity change
                onWorkbooksChange?.(workbooksList.length)
            } else {
                console.error('Error loading workbooks')
            }
        } catch (error) {
            console.error('Error loading workbooks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (file: File, workbookId?: string, fileType: 'pdf' | 'video' = 'pdf') => {
        const uploadKey = workbookId ? `${workbookId}_${fileType}` : `new_${fileType}`
        setUploading(prev => ({ ...prev, [uploadKey]: true }))

        try {
            const formData = new FormData()
            formData.append('file', file)

            // Determine file path and extension
            const fileExtension = fileType === 'pdf' ? '.pdf' : '.mp4'
            const fileName = fileType === 'pdf' ? 'workbook' : 'video'
            const path = `courses/${documentTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}/workbooks/${fileName}-${workbooks.length + 1}${fileExtension}`

            formData.append('path', path)
            formData.append('bucket', 'course-materials')

            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                const publicUrl = data.url

                if (workbookId && editingWorkbook) {
                    if (fileType === 'pdf') {
                        setEditingWorkbook({ ...editingWorkbook, file_url: publicUrl })
                    } else {
                        setEditingWorkbook({ ...editingWorkbook, video_url: publicUrl })
                    }
                } else {
                    if (fileType === 'pdf') {
                        setNewWorkbook({ ...newWorkbook, file_url: publicUrl })
                    } else {
                        setNewWorkbook({ ...newWorkbook, video_url: publicUrl })
                    }
                }
            } else {
                alert('Error loading file')
            }
        } catch (error) {
            console.error('Error uploading file:', error)
            alert('Error loading file')
        } finally {
            setUploading(prev => ({ ...prev, [uploadKey]: false }))
        }
    }

    const handleAddWorkbook = async () => {
        try {
            const response = await fetch('/api/admin/workbooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    document_id: documentId,
                    ...newWorkbook
                }),
            })

            if (response.ok) {
                const data = await response.json()
                const newWorkbooksList = [...workbooks, data.workbook]
                setWorkbooks(newWorkbooksList)
                onWorkbooksChange?.(newWorkbooksList.length)
                setNewWorkbook({
                    title: '',
                    description: '',
                    file_url: '',
                    video_url: '',
                    order_index: 0
                })
                setIsAddDialogOpen(false)
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error adding workbook:', error)
            alert('Error adding workbook')
        }
    }

    const handleUpdateWorkbook = async (workbook: Workbook) => {
        try {
            const response = await fetch('/api/admin/workbooks', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workbook),
            })

            if (response.ok) {
                const data = await response.json()
                setWorkbooks(workbooks.map(w =>
                    w.id === workbook.id ? data.workbook : w
                ))
                setEditingWorkbook(null)
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating workbook:', error)
            alert('Error updating workbook')
        }
    }

    const handleDeleteWorkbook = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workbook?')) {
            return
        }

        try {
            const response = await fetch(`/api/admin/workbooks?id=${id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                const newWorkbooksList = workbooks.filter(w => w.id !== id)
                setWorkbooks(newWorkbooksList)
                onWorkbooksChange?.(newWorkbooksList.length)
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting workbook:', error)
            alert('Error deleting workbook')
        }
    }

    const handleToggleActive = async (workbook: Workbook) => {
        try {
            const response = await fetch('/api/admin/workbooks', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: workbook.id,
                    is_active: !workbook.is_active
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setWorkbooks(workbooks.map(w =>
                    w.id === workbook.id ? data.workbook : w
                ))
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Error updating status')
        }
    }

    const handleReorder = async (workbook: Workbook, direction: 'up' | 'down') => {
        const currentIndex = workbooks.findIndex(w => w.id === workbook.id)
        if (currentIndex === -1) return

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (newIndex < 0 || newIndex >= workbooks.length) return

        const targetWorkbook = workbooks[newIndex]

        try {
            // Swap order for both workbooks
            await Promise.all([
                fetch('/api/admin/workbooks', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: workbook.id, order_index: targetWorkbook.order_index })
                }),
                fetch('/api/admin/workbooks', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: targetWorkbook.id, order_index: workbook.order_index })
                })
            ])

            // Update local state
            const newWorkbooks = [...workbooks]
            newWorkbooks[currentIndex] = { ...workbook, order_index: targetWorkbook.order_index }
            newWorkbooks[newIndex] = { ...targetWorkbook, order_index: workbook.order_index }
            setWorkbooks(newWorkbooks.sort((a, b) => a.order_index - b.order_index))

        } catch (error) {
            console.error('Error reordering:', error)
            alert('Error reordering')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Workbooks</h3>
                    <p className="text-sm text-gray-600">Manage course workbooks</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Add workbook
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add workbook</DialogTitle>
                            <DialogDescription>
                                Create a new workbook for the course
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="workbook-title">Title *</Label>
                                <Input
                                    id="workbook-title"
                                    value={newWorkbook.title}
                                    onChange={(e) => setNewWorkbook({ ...newWorkbook, title: e.target.value })}
                                    placeholder="Workbook title"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="workbook-description">Description</Label>
                                <Textarea
                                    id="workbook-description"
                                    value={newWorkbook.description}
                                    onChange={(e) => setNewWorkbook({ ...newWorkbook, description: e.target.value })}
                                    placeholder="Workbook description"
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Workbook file *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newWorkbook.file_url}
                                        onChange={(e) => setNewWorkbook({ ...newWorkbook, file_url: e.target.value })}
                                        placeholder="Workbook file URL"
                                    />
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(file, undefined, 'pdf')
                                            }
                                        }}
                                        className="hidden"
                                        id="workbook-file-upload"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('workbook-file-upload')?.click()}
                                        disabled={uploading['new_pdf']}
                                    >
                                        {uploading['new_pdf'] ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Video explanation (optional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newWorkbook.video_url}
                                        onChange={(e) => setNewWorkbook({ ...newWorkbook, video_url: e.target.value })}
                                        placeholder="Video explanation URL"
                                    />
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(file, undefined, 'video')
                                            }
                                        }}
                                        className="hidden"
                                        id="workbook-video-upload"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('workbook-video-upload')?.click()}
                                        disabled={uploading['new_video']}
                                    >
                                        {uploading['new_video'] ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    The video will appear before the workbook for users
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddWorkbook}>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {workbooks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No workbooks added</p>
                    <p className="text-sm">Add the first workbook for the course</p>
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Materials</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workbooks.map((workbook) => (
                                <TableRow key={workbook.id}>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReorder(workbook, 'up')}
                                                disabled={workbook.order_index === 1}
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReorder(workbook, 'down')}
                                                disabled={workbook.order_index === workbooks.length}
                                            >
                                                <ArrowDown className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{workbook.title}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm text-gray-600 max-w-xs truncate">
                                            {workbook.description || 'No description'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-4 w-4 text-green-600" />
                                                {workbook.file_url ? (
                                                    <span className="text-xs text-green-600">PDF</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No PDF</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <PlayCircle className="h-4 w-4 text-blue-600" />
                                                {workbook.video_url ? (
                                                    <span className="text-xs text-blue-600">Video</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No video</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant={workbook.is_active ? "default" : "outline"}
                                            onClick={() => handleToggleActive(workbook)}
                                        >
                                            {workbook.is_active ? (
                                                <>
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    Active
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="h-3 w-3 mr-1" />
                                                    Hidden
                                                </>
                                            )}
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingWorkbook(workbook)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteWorkbook(workbook.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Edit dialog */}
            {editingWorkbook && (
                <Dialog open={!!editingWorkbook} onOpenChange={() => setEditingWorkbook(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit workbook</DialogTitle>
                            <DialogDescription>
                                Update workbook information
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-workbook-title">Title</Label>
                                <Input
                                    id="edit-workbook-title"
                                    value={editingWorkbook.title}
                                    onChange={(e) => setEditingWorkbook({ ...editingWorkbook, title: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-workbook-description">Description</Label>
                                <Textarea
                                    id="edit-workbook-description"
                                    value={editingWorkbook.description || ''}
                                    onChange={(e) => setEditingWorkbook({ ...editingWorkbook, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Workbook file</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={editingWorkbook.file_url}
                                        onChange={(e) => setEditingWorkbook({ ...editingWorkbook, file_url: e.target.value })}
                                        placeholder="Workbook file URL"
                                    />
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(file, editingWorkbook.id, 'pdf')
                                            }
                                        }}
                                        className="hidden"
                                        id="edit-workbook-file-upload"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('edit-workbook-file-upload')?.click()}
                                        disabled={uploading[`${editingWorkbook.id}_pdf`]}
                                    >
                                        {uploading[`${editingWorkbook.id}_pdf`] ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Video explanation</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={editingWorkbook.video_url || ''}
                                        onChange={(e) => setEditingWorkbook({ ...editingWorkbook, video_url: e.target.value })}
                                        placeholder="Video explanation URL"
                                    />
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(file, editingWorkbook.id, 'video')
                                            }
                                        }}
                                        className="hidden"
                                        id="edit-workbook-video-upload"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('edit-workbook-video-upload')?.click()}
                                        disabled={uploading[`${editingWorkbook.id}_video`]}
                                    >
                                        {uploading[`${editingWorkbook.id}_video`] ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    The video will appear before the workbook for users
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingWorkbook(null)}>
                                Cancel
                            </Button>
                            <Button onClick={() => handleUpdateWorkbook(editingWorkbook)}>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
