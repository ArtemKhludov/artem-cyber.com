'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Mail, CheckCircle, ArrowLeft } from 'lucide-react'

interface ResetPasswordModalProps {
    isOpen: boolean
    onClose: () => void
    onBack: () => void
    email: string
}

export default function ResetPasswordModal({
    isOpen,
    onClose,
    onBack,
    email
}: ResetPasswordModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState('')

    const handleResetPassword = async () => {
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (response.ok) {
                setIsSent(true)
            } else {
                setError(data.error || 'Ошибка отправки письма')
            }
        } catch (error) {
            setError('Ошибка сети. Попробуйте позже.')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl border-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white relative">
                    <button
                        onClick={onBack}
                        className="absolute top-4 left-4 text-white/80 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">
                                {isSent ? 'Письмо отправлено' : 'Сброс пароля'}
                            </h2>
                            <p className="text-white/90 text-sm">
                                {isSent ? 'Проверьте вашу почту' : 'Восстановление доступа к аккаунту'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {!isSent ? (
                        <>
                            {/* Email Info */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-green-100 p-2 rounded-lg">
                                        <Mail size={16} className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Email для восстановления</p>
                                        <p className="text-sm text-gray-600">{email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Message */}
                            <div className="text-center space-y-3">
                                <p className="text-gray-700 leading-relaxed">
                                    Мы отправим ссылку для сброса пароля на указанный email.
                                    Ссылка будет действительна в течение 1 часа.
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3">
                                <Button
                                    onClick={handleResetPassword}
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Отправляем...
                                        </>
                                    ) : (
                                        <>
                                            <Mail size={18} className="mr-2" />
                                            Отправить ссылку
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Success */}
                            <div className="text-center space-y-4">
                                <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                                    <CheckCircle size={32} className="text-green-600" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Письмо отправлено!
                                    </h3>
                                    <p className="text-gray-700 leading-relaxed">
                                        Мы отправили ссылку для сброса пароля на <strong>{email}</strong>
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-blue-800 text-sm">
                                        <strong>Что делать дальше:</strong>
                                    </p>
                                    <ul className="text-blue-700 text-sm mt-2 space-y-1 text-left">
                                        <li>• Проверьте папку "Входящие"</li>
                                        <li>• Если письма нет, проверьте "Спам"</li>
                                        <li>• Перейдите по ссылке в письме</li>
                                        <li>• Создайте новый пароль</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <Button
                                    onClick={onClose}
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    Понятно
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </div>
    )
}
