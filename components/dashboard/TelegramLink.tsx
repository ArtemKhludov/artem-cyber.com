'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, ExternalLink, Loader2, MessageSquare, Settings } from 'lucide-react'

interface TelegramStatus {
    isLinked: boolean
    telegramUsername?: string
    notifyEnabled: boolean
}

export function TelegramLink() {
    const [status, setStatus] = useState<TelegramStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [linking, setLinking] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchStatus = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/user/telegram/link', {
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Не удалось получить статус Telegram')
            }

            const data = await response.json()
            setStatus(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла ошибка')
        } finally {
            setLoading(false)
        }
    }

    const handleLink = async () => {
        try {
            setLinking(true)
            setError(null)

            const response = await fetch('/api/user/telegram/link', {
                method: 'POST',
                credentials: 'include'
            })

            if (!response.ok) {
                const body = await response.json()
                throw new Error(body.error || 'Не удалось создать ссылку для связывания')
            }

            const data = await response.json()

            // Открываем Telegram с deep-link
            window.open(data.deepLink, '_blank')

            // Обновляем статус через 3 секунды
            setTimeout(() => {
                fetchStatus()
            }, 3000)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла ошибка')
        } finally {
            setLinking(false)
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Telegram уведомления
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-600">Загрузка...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Telegram уведомления
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchStatus}
                            className="ml-auto"
                        >
                            Повторить
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Telegram уведомления
                </CardTitle>
                <CardDescription>
                    Получайте мгновенные уведомления о новых ответах на ваши обращения
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {status?.isLinked ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-green-700 font-medium">Telegram аккаунт связан</span>
                        </div>

                        {status.telegramUsername && (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">@{status.telegramUsername}</Badge>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                Уведомления: {status.notifyEnabled ? 'Включены' : 'Отключены'}
                            </span>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Совет:</strong> Для отключения уведомлений напишите боту команду /unlink
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <span className="text-amber-700 font-medium">Telegram аккаунт не связан</span>
                        </div>

                        <p className="text-sm text-gray-600">
                            Свяжите ваш Telegram аккаунт, чтобы получать мгновенные уведомления о новых ответах на ваши обращения в поддержку.
                        </p>

                        <Button
                            onClick={handleLink}
                            disabled={linking}
                            className="w-full"
                        >
                            {linking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Создание ссылки...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Подключить Telegram
                                </>
                            )}
                        </Button>

                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600">
                                <strong>Как это работает:</strong><br />
                                1. Нажмите "Подключить Telegram"<br />
                                2. Откроется Telegram с ссылкой на бота<br />
                                3. Нажмите "Start" в боте<br />
                                4. Готово! Вы будете получать уведомления
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
