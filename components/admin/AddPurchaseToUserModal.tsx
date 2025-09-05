'use client'

import { useState, useEffect } from 'react'
import { X, Plus, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AddPurchaseToUserModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    userName: string
    onSuccess: () => void
}

interface Product {
    id: string
    name: string
    type: string
    price: number
}

export default function AddPurchaseToUserModal({
    isOpen,
    onClose,
    userId,
    userName,
    onSuccess
}: AddPurchaseToUserModalProps) {
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState<string>('')
    const [amount, setAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState<string>('Stripe')
    const [status, setStatus] = useState<string>('completed')

    useEffect(() => {
        if (isOpen) {
            fetchProducts()
        }
    }, [isOpen])

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/admin/data?type=documents')
            const result = await response.json()

            if (result.success) {
                setProducts(result.data || [])
            }
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedProduct || !amount) {
            alert('Пожалуйста, заполните все поля')
            return
        }

        setLoading(true)
        try {
            const product = products.find(p => p.id === selectedProduct)

            const response = await fetch('/api/admin/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'purchase',
                    data: {
                        name: userName,
                        phone: '', // Будет заполнено из пользователя
                        email: '',
                        product_name: product?.name || '',
                        product_type: product?.type || 'pdf',
                        amount: amount,
                        status: status,
                        payment_method: paymentMethod,
                        currency: 'RUB',
                        user_id: userId
                    }
                })
            })

            const result = await response.json()

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                alert('Ошибка добавления покупки: ' + result.error)
            }
        } catch (error) {
            console.error('Error adding purchase:', error)
            alert('Ошибка добавления покупки')
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
                        <div className="flex items-center space-x-3">
                            <ShoppingCart className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Добавить покупку</h2>
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
                    <p className="text-green-100 mt-1">Пользователь: {userName}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Выберите продукт
                        </label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value)
                                const product = products.find(p => p.id === e.target.value)
                                if (product) {
                                    setAmount(product.price)
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                        >
                            <option value="">Выберите продукт</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} - {product.price} ₽
                                </option>
                            ))}
                        </select>
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
                            required
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
                            <option value="Stripe">Stripe</option>
                            <option value="Cryptomus">Cryptomus</option>
                            <option value="Наличные">Наличные</option>
                            <option value="Банковский перевод">Банковский перевод</option>
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
                            <option value="completed">Завершено</option>
                            <option value="pending">В ожидании</option>
                            <option value="cancelled">Отменено</option>
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
                                    <span>Добавление...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Plus className="w-4 h-4" />
                                    <span>Добавить покупку</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
