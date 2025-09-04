'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { User, Mail, Phone, MapPin } from 'lucide-react'

interface CustomerData {
    name: string
    email: string
    phone: string
    country: string
}

interface CustomerDataFormProps {
    onSubmit: (data: CustomerData) => void
    loading?: boolean
}

export function CustomerDataForm({ onSubmit, loading = false }: CustomerDataFormProps) {
    const [formData, setFormData] = useState<CustomerData>({
        name: '',
        email: '',
        phone: '',
        country: ''
    })

    const [errors, setErrors] = useState<Partial<CustomerData>>({})

    const validateForm = (): boolean => {
        const newErrors: Partial<CustomerData> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Имя обязательно'
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email обязателен'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Неверный формат email'
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Телефон обязателен'
        } else if (!/^[+]?[0-9\s\-()]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Неверный формат телефона'
        }

        if (!formData.country.trim()) {
            newErrors.country = 'Страна обязательна'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (validateForm()) {
            onSubmit(formData)
        }
    }

    const handleInputChange = (field: keyof CustomerData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Очищаем ошибку при изменении поля
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }))
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Данные для доставки
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Имя и фамилия *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'
                                }`}
                            placeholder="Введите ваше имя и фамилию"
                        />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'
                                }`}
                            placeholder="your@email.com"
                        />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Телефон *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone ? 'border-red-300' : 'border-gray-300'
                                }`}
                            placeholder="+7 (999) 123-45-67"
                        />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                        Страна *
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="country"
                            type="text"
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.country ? 'border-red-300' : 'border-gray-300'
                                }`}
                            placeholder="Россия"
                        />
                    </div>
                    {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all duration-300"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Обрабатываем заказ...
                            </div>
                        ) : (
                            'Подтвердить заказ'
                        )}
                    </Button>
                </div>
            </form>

            <div className="mt-4 text-xs text-gray-500">
                <p>* Обязательные поля</p>
                <p>Эти данные будут использованы для доставки материалов и создания личного кабинета</p>
            </div>
        </div>
    )
}
