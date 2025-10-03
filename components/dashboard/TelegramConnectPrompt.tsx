'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, MessageCircle, Bell, Zap, Shield, CheckCircle } from 'lucide-react'

interface TelegramConnectPromptProps {
    isOpen: boolean
    onClose: () => void
    onConnect: () => void
}

export function TelegramConnectPrompt({ isOpen, onClose, onConnect }: TelegramConnectPromptProps) {
    const [isConnecting, setIsConnecting] = useState(false)

    if (!isOpen) return null

    const handleConnect = async () => {
        setIsConnecting(true)
        try {
            // Здесь будет логика подключения Telegram
            onConnect()
            onClose()
        } catch (error) {
            console.error('Error connecting Telegram:', error)
        } finally {
            setIsConnecting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl animate-fade-in-up">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 text-gray-500 hover:bg-gray-100"
                    onClick={onClose}
                >
                    <X className="h-5 w-5" />
                </Button>

                <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Подключите Telegram для мгновенных уведомлений! 🚀
                    </h2>
                    <p className="text-gray-600">
                        Получайте уведомления о новых сообщениях, статусе заявок и важных обновлениях прямо в Telegram
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Zap className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800">Мгновенные уведомления</h3>
                            <p className="text-sm text-gray-600">Получайте ответы от специалистов в реальном времени</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bell className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800">Статус заявок</h3>
                            <p className="text-sm text-gray-600">Уведомления об изменении статуса ваших обращений</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Shield className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800">Безопасность</h3>
                            <p className="text-sm text-gray-600">Ваши данные защищены, уведомления только для вас</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Бесплатно • Без спама • Легко отключить</span>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <Button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3"
                    >
                        {isConnecting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Подключение...
                            </>
                        ) : (
                            <>
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Подключить Telegram
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            localStorage.setItem('telegram_prompt_dismissed', 'true')
                            onClose()
                        }}
                        className="px-6 py-3"
                    >
                        Позже
                    </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                    Вы можете подключить Telegram в любое время в настройках профиля
                </p>
            </div>
        </div>
    )
}
