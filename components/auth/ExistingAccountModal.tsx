'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Mail, Key, AlertCircle } from 'lucide-react'

interface ExistingAccountModalProps {
    isOpen: boolean
    onClose: () => void
    onLogin: () => void
    onResetPassword: () => void
    email: string
    name: string
}

export default function ExistingAccountModal({
    isOpen,
    onClose,
    onLogin,
    onResetPassword,
    email,
    name
}: ExistingAccountModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl border-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white relative">
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
                            <h2 className="text-xl font-bold">Аккаунт уже существует</h2>
                            <p className="text-white/90 text-sm">Мы нашли ваш профиль в системе</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* User Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Mail size={16} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{name}</p>
                                <p className="text-sm text-gray-600">{email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <div className="text-center space-y-3">
                        <p className="text-gray-700 leading-relaxed">
                            На указанные данные уже зарегистрирован аккаунт.
                            Вы можете войти в систему или восстановить пароль.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button
                            onClick={onLogin}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            <Key size={18} className="mr-2" />
                            Войти в аккаунт
                        </Button>

                        <Button
                            onClick={onResetPassword}
                            variant="outline"
                            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-all duration-200"
                        >
                            <Mail size={18} className="mr-2" />
                            Сбросить пароль
                        </Button>
                    </div>

                    {/* Help Text */}
                    <div className="text-center">
                        <p className="text-xs text-gray-500">
                            Не помните пароль? Мы отправим ссылку для восстановления на вашу почту
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
