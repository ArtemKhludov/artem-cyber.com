'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Key, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [isSuccess, setIsSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            router.push('/auth/login')
        }
    }, [token, router])

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
            const response = await fetch('/api/auth/set-new-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password }),
            })

            const data = await response.json()

            if (response.ok) {
                setIsSuccess(true)
                setTimeout(() => {
                    router.push('/auth/login')
                }, 3000)
            } else {
                setError(data.error || 'Ошибка установки пароля')
            }
        } catch (error) {
            setError('Ошибка сети. Попробуйте позже.')
        } finally {
            setIsLoading(false)
        }
    }

    if (!token) {
        return null
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl border-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Пароль изменен!</h1>
                                <p className="text-white/90 text-sm">Вы успешно установили новый пароль</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 text-center space-y-4">
                        <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                            <CheckCircle size={32} className="text-green-600" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Отлично!
                            </h2>
                            <p className="text-gray-700">
                                Ваш пароль успешно изменен. Теперь вы можете войти в систему с новым паролем.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-800 text-sm">
                                Через несколько секунд вы будете перенаправлены на страницу входа...
                            </p>
                        </div>

                        <Button
                            onClick={() => router.push('/auth/login')}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Войти в систему
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Key size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Новый пароль</h1>
                            <p className="text-white/90 text-sm">Установите новый пароль для вашего аккаунта</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Password */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-gray-700">
                            Новый пароль
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                                placeholder="Введите новый пароль"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                            Подтвердите пароль
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                                placeholder="Подтвердите новый пароль"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Устанавливаем пароль...
                            </>
                        ) : (
                            <>
                                <Key size={18} className="mr-2" />
                                Установить пароль
                            </>
                        )}
                    </Button>

                    {/* Back to Login */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => router.push('/auth/login')}
                            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Вернуться к входу
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
