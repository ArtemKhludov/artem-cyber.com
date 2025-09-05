'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditRequestModalProps {
    isOpen: boolean
    onClose: () => void
    request: {
        id: string
        product_type: string
        product_name: string
        message: string
        status: string
        source_page: string
    }
    onSuccess: () => void
}

export default function EditRequestModal({
    isOpen,
    onClose,
    request,
    onSuccess
}: EditRequestModalProps) {
    const [loading, setLoading] = useState(false)
    const [productType, setProductType] = useState(request.product_type)
    const [productName, setProductName] = useState(request.product_name)
    const [message, setMessage] = useState(request.message)
    const [status, setStatus] = useState(request.status)
    const [sourcePage, setSourcePage] = useState(request.source_page)

    useEffect(() => {
        if (isOpen) {
            setProductType(request.product_type)
            setProductName(request.product_name)
            setMessage(request.message)
            setStatus(request.status)
            setSourcePage(request.source_page)
        }
    }, [isOpen, request])

    const productTypes = [
        { value: 'callback', label: 'Заказ обратного звонка', name: 'Заказ обратного звонка' },
        { value: 'consultation', label: 'Консультация', name: 'Консультация по энергетике' },
        { value: 'pdf', label: 'PDF файл', name: 'PDF файл по энергетике' },
        { value: 'program', label: 'Программа', name: 'Программа 21 день' },
        { value: 'course', label: 'Онлайн-курс', name: 'Онлайн-курс по энергетике' }
    ]

    const statuses = [
        { value: 'new', label: 'Новая' },
        { value: 'completed', label: 'Завершена' },
        { value: 'pending', label: 'В ожидании' },
        { value: 'cancelled', label: 'Отменена' }
    ]

    const sourcePages = [
        { value: 'manual', label: 'Ручное добавление' },
        { value: '/', label: 'Главная страница' },
        { value: '/about', label: 'О проекте' },
        { value: '/contacts', label: 'Контакты' },
        { value: '/catalog', label: 'Каталог' },
        { value: '/book', label: 'Программы' }
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        setLoading(true)
        try {
            const response = await fetch('/api/admin/data', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'request',
                    id: request.id,
                    data: {
                        product_type: productType,
                        product_name: productName,
                        message: message || null,
                        status: status,
                        source_page: sourcePage
                    }
                })
            })

            const result = await response.json()

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                alert('Ошибка обновления заявки: ' + result.error)
            }
        } catch (error) {
            console.error('Error updating request:', error)
            alert('Ошибка обновления заявки')
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
                        <h2 className="text-xl font-bold">Редактировать заявку</h2>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white hover:bg-opacity-20"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Тип заявки
                        </label>
                        <select
                            value={productType}
                            onChange={(e) => handleProductTypeChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            Название продукта/услуги
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Сообщение
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Статус
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {statuses.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Источник
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
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Сохранение...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Save className="w-4 h-4" />
                                    <span>Сохранить</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
