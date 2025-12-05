'use client'

import { useState } from 'react'
import { X, Plus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AddRequestToUserModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    userName: string
    userPhone: string
    userEmail: string
    onSuccess: () => void
}

export default function AddRequestToUserModal({
    isOpen,
    onClose,
    userId,
    userName,
    userPhone,
    userEmail,
    onSuccess
}: AddRequestToUserModalProps) {
    const [loading, setLoading] = useState(false)
    const [productType, setProductType] = useState<string>('callback')
    const [productName, setProductName] = useState<string>('Callback Request')
    const [message, setMessage] = useState<string>('')
    const [sourcePage, setSourcePage] = useState<string>('manual')

    const productTypes = [
        { value: 'callback', label: 'Callback Request', name: 'Callback Request' },
        { value: 'consultation', label: 'Consultation', name: 'Energy Consultation' },
        { value: 'pdf', label: 'PDF File', name: 'Energy PDF File' },
        { value: 'program', label: 'Program', name: '21 Days Program' },
        { value: 'course', label: 'Online Course', name: 'Energy Online Course' }
    ]

    const sourcePages = [
        { value: 'manual', label: 'Manual Entry' },
        { value: '/', label: 'Home Page' },
        { value: '/about', label: 'About' },
        { value: '/contacts', label: 'Contacts' },
        { value: '/catalog', label: 'Catalog' },
        { value: '/book', label: 'Programs' }
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!productType) {
            alert('Please select request type')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/admin/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'request',
                    data: {
                        name: userName,
                        phone: userPhone,
                        email: userEmail,
                        product_type: productType,
                        product_name: productName,
                        message: message || null,
                        source_page: sourcePage,
                        source: 'manual',
                        user_id: userId
                    }
                })
            })

            const result = await response.json()

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                alert('Error adding request: ' + result.error)
            }
        } catch (error) {
            console.error('Error adding request:', error)
            alert('Error adding request')
        } finally {
            setLoading(false)
        }
    }

    const handleProductTypeChange = (type: string) => {
        setProductType(type)
        const product = productTypes.find(p => p.value === type)
        if (product) {
            setProductName(product.name)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <MessageSquare className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Add Request</h2>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white hover:bg-opacity-20"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <p className="text-blue-100 mt-1">User: {userName}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Request Type
                        </label>
                        <select
                            value={productType}
                            onChange={(e) => handleProductTypeChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {productTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product/Service Name
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Additional information..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Source
                        </label>
                        <select
                            value={sourcePage}
                            onChange={(e) => setSourcePage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {sourcePages.map((page) => (
                                <option key={page.value} value={page.value}>
                                    {page.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Adding...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Plus className="w-4 h-4" />
                                    <span>Add Request</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
