'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DollarSign,
    Save,
    Edit,
    X,
    Check,
    AlertCircle
} from 'lucide-react'

interface Document {
    id: string
    title: string
    price_rub: number
    price: number
}

export function PricingManagement() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingPrices, setEditingPrices] = useState<{ [key: string]: number }>({})
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        loadPricing()
    }, [])

    const loadPricing = async () => {
        try {
            const response = await fetch('/api/admin/pricing')
            if (response.ok) {
                const data = await response.json()
                setDocuments(data.documents)
                // Initialize editable prices
                const initialPrices: { [key: string]: number } = {}
                data.documents.forEach((doc: Document) => {
                    initialPrices[doc.id] = doc.price_rub
                })
                setEditingPrices(initialPrices)
            } else {
                console.error('Failed to load prices')
            }
        } catch (error) {
            console.error('Failed to load prices:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePriceChange = (documentId: string, newPrice: number) => {
        setEditingPrices(prev => ({
            ...prev,
            [documentId]: newPrice
        }))

        // Check if there are changes
        const originalPrice = documents.find(doc => doc.id === documentId)?.price_rub
        setHasChanges(originalPrice !== newPrice)
    }

    const handleSavePrices = async () => {
        setSaving(true)

        try {
            // Prepare updates only for changed prices
            const updates = documents
                .filter(doc => editingPrices[doc.id] !== doc.price_rub)
                .map(doc => ({
                    id: doc.id,
                    price_rub: editingPrices[doc.id]
                }))

            if (updates.length === 0) {
                alert('No changes to save')
                setSaving(false)
                return
            }

            const response = await fetch('/api/admin/pricing', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ updates }),
            })

            if (response.ok) {
                const data = await response.json()

                // Update local state
                setDocuments(prev => prev.map(doc => {
                    const newPrice = editingPrices[doc.id]
                    return newPrice !== doc.price_rub
                        ? { ...doc, price_rub: newPrice, price: newPrice }
                        : doc
                }))

                setHasChanges(false)
                alert(`Successfully updated ${updates.length} prices`)
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error saving prices:', error)
            alert('Failed to save prices')
        } finally {
            setSaving(false)
        }
    }

    const handleResetPrices = () => {
        const originalPrices: { [key: string]: number } = {}
        documents.forEach(doc => {
            originalPrices[doc.id] = doc.price_rub
        })
        setEditingPrices(originalPrices)
        setHasChanges(false)
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price)
    }

    const getPriceChangeIndicator = (documentId: string) => {
        const originalPrice = documents.find(doc => doc.id === documentId)?.price_rub
        const newPrice = editingPrices[documentId]

        if (originalPrice === newPrice) return null

        if (newPrice > (originalPrice || 0)) {
            return <span className="text-green-600 text-sm">↗ +{formatPrice(newPrice - (originalPrice || 0))}</span>
        } else {
            return <span className="text-red-600 text-sm">↘ -{formatPrice((originalPrice || 0) - newPrice)}</span>
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pricing management</h2>
                    <p className="text-gray-600">Edit prices for PDF documents</p>
                </div>
                <div className="flex gap-2">
                    {hasChanges && (
                        <Button
                            variant="outline"
                            onClick={handleResetPrices}
                            className="text-gray-600"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                    )}
                    <Button
                        onClick={handleSavePrices}
                        disabled={!hasChanges || saving}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save changes
                    </Button>
                </div>
            </div>

            {hasChanges && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                        <span className="text-yellow-800">
                            You have unsaved changes. Don’t forget to save them.
                        </span>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-2" />
                        Document prices ({documents.length})
                    </CardTitle>
                    <CardDescription>
                        Click a price to edit it. Changes are saved only after pressing “Save changes.”
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document title</TableHead>
                                <TableHead>Current price</TableHead>
                                <TableHead>New price</TableHead>
                                <TableHead>Change</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((document) => (
                                <TableRow key={document.id}>
                                    <TableCell>
                                        <div className="font-medium">{document.title}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-gray-900">
                                            {formatPrice(document.price_rub)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={editingPrices[document.id] || ''}
                                                onChange={(e) => handlePriceChange(document.id, parseInt(e.target.value) || 0)}
                                                className="w-32"
                                                min="0"
                                            />
                                            <span className="text-gray-500">₽</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getPriceChangeIndicator(document.id)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {documents.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents</h3>
                        <p className="text-gray-600">
                            Add documents first in the “Document management” section.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
