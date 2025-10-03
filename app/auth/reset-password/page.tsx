'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react'

function ResetPasswordContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isValidating, setIsValidating] = useState(true)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [token, setToken] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const tokenParam = searchParams.get('token')
        if (!tokenParam) {
            setError('Токен восстановления не найден')
            setIsValidating(false)
            return
        }

        setToken(tokenParam)
        validateToken(tokenParam)
    }, [searchParams])

    const validateToken = async (token: string) => {
        try {
            const response = await fetch(`/api/auth/reset-password?token=${token}`)
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Недействительный токен')
            }
        } catch (error) {
            setError('Ошибка при проверке токена')
        } finally {
            setIsValidating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Пароли не совпадают')
            return
        }

        if (password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password }),
            })

            const data = await response.json()

            if (response.ok) {
                setIsSuccess(true)
            } else {
                setError(data.error || 'Произошла ошибка')
            }
        } catch (error) {
            setError('Произошла ошибка при сбросе пароля')
        } finally {
            setIsLoading(false)
        }
    }

    if (isValidating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center space-x-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-gray-600">🤖 ИИ проверяет токен...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            🎉 Пароль успешно изменен!
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            ИИ обновил ваши данные безопасности
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                Ваш пароль был успешно изменен. Все активные сессии были завершены
                                для обеспечения безопасности.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                💡 <strong>Интересный факт:</strong> Наш ИИ автоматически отозвал
                                все ваши активные сессии для максимальной безопасности!
                            </p>

                            <Button asChild className="w-full">
                                <Link href="/auth/login">
                                    🚀 Войти с новым паролем
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error && !token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            ❌ Ошибка
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            Не удалось загрузить страницу восстановления
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>

                        <div className="flex flex-col space-y-2">
                            <Button asChild>
                                <Link href="/auth/forgot-password">
                                    Запросить новую ссылку
                                </Link>
                            </Button>

                            <Button asChild variant="outline">
                                <Link href="/auth/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Вернуться к входу
                                </Link>
                            </Button>
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
                        <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        🔐 Новый пароль
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Введите новый пароль для вашего аккаунта
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Новый пароль</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Минимум 6 символов"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Повторите пароль"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
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
                                    ИИ обновляет пароль...
                                </>
                            ) : (
                                '🚀 Установить новый пароль'
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

                        <Button asChild variant="outline" className="w-full">
                            <Link href="/auth/login">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Вернуться к входу
                            </Link>
                        </Button>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Совет:</strong> Используйте надежный пароль с буквами,
                            цифрами и специальными символами для максимальной безопасности.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Загрузка...</span>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}