'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, UserPlus, Mail, AlertCircle, ArrowLeft } from 'lucide-react'

interface UserNotFoundModalProps {
    isOpen: boolean
    onClose: () => void
    onRegister: () => void
    onResetPassword: () => void
    email: string
}

export default function UserNotFoundModal({
    isOpen,
    onClose,
    onRegister,
    onResetPassword,
    email
}: UserNotFoundModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl border-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Пользователь не найден</h2>
                            <p className="text-white/90 text-sm">Аккаунт с такими данными не существует</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Email Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <div className="bg-orange-100 p-2 rounded-lg">
                                <Mail size={16} className="text-orange-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Введенный email</p>
                                <p className="text-sm text-gray-600">{email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <div className="text-center space-y-3">
                        <p className="text-gray-700 leading-relaxed">
                            Пользователь с указанным email не зарегистрирован в системе.
                            Возможно, вы ошиблись в написании или хотите создать новый аккаунт?
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button
                            onClick={onRegister}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            <UserPlus size={18} className="mr-2" />
                            Создать новый аккаунт
                        </Button>

                        <Button
                            onClick={onResetPassword}
                            variant="outline"
                            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-all duration-200"
                        >
                            <Mail size={18} className="mr-2" />
                            Попробовать сбросить пароль
                        </Button>
                    </div>

                    {/* Help Text */}
                    <div className="text-center">
                        <p className="text-xs text-gray-500">
                            Если вы уверены, что аккаунт существует, попробуйте сбросить пароль
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
