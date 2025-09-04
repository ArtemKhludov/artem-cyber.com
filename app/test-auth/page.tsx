'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function TestAuthPage() {
    const { user, login, logout } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [result, setResult] = useState<any>(null)

    const handleLogin = async () => {
        const loginResult = await login(email, password)
        setResult(loginResult)
        console.log('Login result:', loginResult)
    }

    const handleLogout = async () => {
        await logout()
        setResult(null)
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Тест авторизации</h1>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-xl font-semibold mb-4">Текущий пользователь:</h2>
                    <pre className="bg-gray-100 p-4 rounded text-sm">
                        {user ? JSON.stringify(user, null, 2) : 'Не авторизован'}
                    </pre>
                </div>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-xl font-semibold mb-4">Вход:</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Email:</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="admin@energylogic.com или user@test.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Пароль:</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="admin123 или user123"
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Войти
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-xl font-semibold mb-4">Результат входа:</h2>
                    <pre className="bg-gray-100 p-4 rounded text-sm">
                        {result ? JSON.stringify(result, null, 2) : 'Нет результата'}
                    </pre>
                </div>

                {user && (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Действия:</h2>
                        <div className="space-x-4">
                            <button
                                onClick={() => window.location.href = '/admin'}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                Перейти в /admin
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                            >
                                Перейти в /dashboard
                            </button>
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
