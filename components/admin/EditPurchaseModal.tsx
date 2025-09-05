'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditPurchaseModalProps {
    isOpen: boolean
    onClose: () => void
    purchase: {
        id: string
        product_name: string
        amount: number
        status: string
        payment_method: string
    }
    onSuccess: () => void
}

export default function EditPurchaseModal({
    isOpen,
    onClose,
    purchase,
    onSuccess
}: EditPurchaseModalProps) {
    const [loading, setLoading] = useState(false)
    const [productName, setProductName] = useState(purchase.product_name)
    const [amount, setAmount] = useState(purchase.amount)
    const [status, setStatus] = useState(purchase.status)
    const [paymentMethod, setPaymentMethod] = useState(purchase.payment_method)

    useEffect(() => {
        if (isOpen) {
            setProductName(purchase.product_name)
            setAmount(purchase.amount)
            setStatus(purchase.status)
            setPaymentMethod(purchase.payment_method)
        }
    }, [isOpen, purchase])

    const statuses = [
        { value: 'completed', label: 'Завершено' },
        { value: 'pending', label: 'В ожидании' },
        { value: 'cancelled', label: 'Отменено' },
        { value: 'refunded', label: 'Возвращено' }
    ]

    const paymentMethods = [
        { value: 'Stripe', label: 'Stripe' },
        { value: 'Cryptomus', label: 'Cryptomus' },
        { value: 'Наличные', label: 'Наличные' },
        { value: 'Банковский перевод', label: 'Банковский перевод' }
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
                    type: 'purchase',
                    id: purchase.id,
                    data: {
                        product_name: productName,
                        amount: amount,
                        status: status,
                        payment_method: paymentMethod
                    }
                })
            })

            const result = await response.json()

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                alert('Ошибка обновления покупки: ' + result.error)
            }
        } catch (error) {
            console.error('Error updating purchase:', error)
            alert('Ошибка обновления покупки')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Редактировать покупку</h2>
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
                            Название продукта
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Сумма (₽)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Способ оплаты
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {paymentMethods.map((method) => (
                                <option key={method.value} value={method.value}>
                                    {method.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Статус
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {statuses.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
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
                            className="flex-1 bg-green-600 hover:bg-green-700"
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
