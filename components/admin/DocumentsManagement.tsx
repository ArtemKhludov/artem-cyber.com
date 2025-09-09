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
    DollarSign
} from 'lucide-react'

interface Document {
    id: string
    title: string
    description: string
    price_rub: number
    file_url: string
    cover_url: string
    page_count: number
    created_at: string
    updated_at: string
}

export function DocumentsManagement() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingDocument, setEditingDocument] = useState<Document | null>(null)
    const [newDocument, setNewDocument] = useState({
        title: '',
        description: '',
        price_rub: '',
        file_url: '',
        cover_url: '',
        page_count: ''
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

    const handleAddDocument = async () => {
        try {
            const response = await fetch('/api/admin/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newDocument),
            })

            if (response.ok) {
                const data = await response.json()
                setDocuments([data.document, ...documents])
                setNewDocument({
                    title: '',
                    description: '',
                    price_rub: '',
                    file_url: '',
                    cover_url: '',
                    page_count: ''
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
        if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
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
                    <h2 className="text-2xl font-bold text-gray-900">Управление документами</h2>
                    <p className="text-gray-600">Добавляйте, редактируйте и удаляйте PDF документы</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить документ
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Добавить новый документ</DialogTitle>
                            <DialogDescription>
                                Заполните информацию о новом PDF документе
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Название *</Label>
                                <Input
                                    id="title"
                                    value={newDocument.title}
                                    onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                                    placeholder="Название документа"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Описание</Label>
                                <Textarea
                                    id="description"
                                    value={newDocument.description}
                                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                    placeholder="Описание документа"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
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
                            <div className="grid gap-2">
                                <Label htmlFor="file_url">URL файла PDF *</Label>
                                <Input
                                    id="file_url"
                                    value={newDocument.file_url}
                                    onChange={(e) => setNewDocument({ ...newDocument, file_url: e.target.value })}
                                    placeholder="https://example.com/document.pdf"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cover_url">URL обложки</Label>
                                <Input
                                    id="cover_url"
                                    value={newDocument.cover_url}
                                    onChange={(e) => setNewDocument({ ...newDocument, cover_url: e.target.value })}
                                    placeholder="https://example.com/cover.png"
                                />
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
                        Список документов ({documents.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Название</TableHead>
                                <TableHead>Цена</TableHead>
                                <TableHead>Страниц</TableHead>
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
                                        <div className="font-medium text-green-600">
                                            {formatPrice(document.price_rub)}
                                        </div>
                                    </TableCell>
                                    <TableCell>{document.page_count}</TableCell>
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
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Редактировать документ</DialogTitle>
                            <DialogDescription>
                                Измените информацию о документе
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
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
                            <div className="grid grid-cols-2 gap-4">
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
                                        value={editingDocument.page_count}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, page_count: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-file_url">URL файла PDF</Label>
                                <Input
                                    id="edit-file_url"
                                    value={editingDocument.file_url}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, file_url: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-cover_url">URL обложки</Label>
                                <Input
                                    id="edit-cover_url"
                                    value={editingDocument.cover_url}
                                    onChange={(e) => setEditingDocument({ ...editingDocument, cover_url: e.target.value })}
                                />
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
