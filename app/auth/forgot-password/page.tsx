'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (response.ok) {
                setIsSuccess(true)
            } else {
                setError(data.error || 'Произошла ошибка')
            }
        } catch (error) {
            setError('Произошла ошибка при отправке запроса')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            🤖 ИИ отправил письмо!
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            Проверьте вашу почту
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Mail className="h-4 w-4" />
                            <AlertDescription>
                                Если пользователь с email <strong>{email}</strong> существует,
                                на него отправлено письмо с инструкциями по восстановлению пароля.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                💡 <strong>Интересный факт:</strong> Наш ИИ использует криптографические
                                алгоритмы военного уровня для защиты ваших данных!
                            </p>

                            <div className="flex flex-col space-y-2">
                                <Button asChild variant="outline">
                                    <Link href="/auth/login">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Вернуться к входу
                                    </Link>
                                </Button>

                                <Button asChild>
                                    <Link href="/">
                                        На главную
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        🔐 Восстановление пароля
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Введите ваш email для получения ссылки восстановления
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ИИ обрабатывает запрос...
                                </>
                            ) : (
                                '🚀 Отправить ссылку восстановления'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 space-y-3">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Или
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                            <Button asChild variant="outline">
                                <Link href="/auth/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Вернуться к входу
                                </Link>
                            </Button>

                            <Button asChild variant="ghost">
                                <Link href="/auth/signup">
                                    Создать новый аккаунт
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Совет:</strong> Наш ИИ отправит вам безопасную ссылку,
                            которая будет действительна в течение 1 часа.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
