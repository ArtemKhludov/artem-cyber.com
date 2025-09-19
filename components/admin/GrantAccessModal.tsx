'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GrantAccessModalProps {
    isOpen: boolean
    onClose: () => void
    defaultEmail?: string
    defaultUserId?: string
    defaultDocumentId?: string
    onSuccess: () => void
}

interface DocumentItem {
    id: string
    title: string
    price_rub?: number
}

export default function GrantAccessModal({
    isOpen,
    onClose,
    defaultEmail,
    defaultUserId,
    defaultDocumentId,
    onSuccess,
}: GrantAccessModalProps) {
    const [email, setEmail] = useState<string>(defaultEmail || '')
    const [userId, setUserId] = useState<string>(defaultUserId || '')
    const [documentId, setDocumentId] = useState<string>(defaultDocumentId || '')
    const [documents, setDocuments] = useState<DocumentItem[]>([])
    const [docFilter, setDocFilter] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const [notes, setNotes] = useState<string>('')
    const [userSearchTerm, setUserSearchTerm] = useState<string>('')
    const [userSuggestions, setUserSuggestions] = useState<Array<{ id: string; name: string; email?: string }>>([])

    useEffect(() => {
        if (isOpen) {
            setEmail(defaultEmail || '')
            setUserId(defaultUserId || '')
            setDocumentId(defaultDocumentId || '')
            setDone(false)
            setError(null)
            setNotes('')
            setDocFilter('')
            setUserSearchTerm('')
            setUserSuggestions([])
            fetchDocuments()
        }
    }, [isOpen, defaultEmail, defaultDocumentId, defaultUserId])

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/admin/data?type=documents')
            const json = await res.json()
            if (json.success) {
                setDocuments(json.data || [])
            }
        } catch (e) {
            // ignore silently
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!documentId) {
            setError('Выберите курс')
            return
        }

        if (!userId && !email) {
            setError('Укажите email или выберите пользователя')
            return
        }
        setLoading(true)
        try {
            const payload: Record<string, unknown> = {
                documentId,
            }

            if (userId) {
                payload.userId = userId
            } else {
                payload.email = email
            }

            if (notes.trim()) {
                payload.notes = notes.trim()
            }

            const res = await fetch('/api/admin/access/grant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const json = await res.json()
            if (!res.ok || json.error) {
                setError(json.error || 'Ошибка выдачи доступа')
                return
            }
            setDone(true)
            onSuccess()
        } catch (e: any) {
            setError(e?.message || 'Ошибка сети')
        } finally {
            setLoading(false)
        }
    }

    const filteredDocuments = useMemo(() => {
        const f = docFilter.trim().toLowerCase()
        if (!f) return documents
        return documents.filter((d) => (d.title || '').toLowerCase().includes(f))
    }, [docFilter, documents])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        <h2 className="text-lg font-semibold">Выдать доступ к курсу</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    {userId ? (
                        <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            Доступ будет выдан пользователю ID <span className="font-mono">{userId}</span>
                            {email && <span className="ml-2">(email: {email})</span>}
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Email пользователя</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="user@example.com"
                                />
                                <p className="mt-1 text-xs text-gray-500">Можно указать email или выбрать пользователя через поиск ниже.</p>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">Найти пользователя по email</label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={userSearchTerm}
                                        onChange={(e) => setUserSearchTerm(e.target.value)}
                                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="user@example.com"
                                    />
                                    <button
                                        type="button"
                                        className="px-3 py-2 rounded-md border text-sm bg-gray-50 hover:bg-gray-100"
                                        onClick={async () => {
                                            try {
                                                if (!userSearchTerm) return
                                                const params = new URLSearchParams({ page: '1', limit: '5', search: userSearchTerm })
                                                const res = await fetch(`/api/users/enhanced?${params.toString()}`)
                                                const json = await res.json()
                                                if (res.ok && Array.isArray(json.data)) {
                                                    setUserSuggestions(json.data.map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
                                                } else {
                                                    setUserSuggestions([])
                                                }
                                            } catch {
                                                setUserSuggestions([])
                                            }
                                        }}
                                    >
                                        Найти
                                    </button>
                                </div>
                                {userSuggestions.length > 0 && (
                                    <div className="mt-2 rounded-md border bg-white shadow-sm max-h-40 overflow-auto">
                                        {userSuggestions.map((u) => (
                                            <button
                                                type="button"
                                                key={u.id}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                                onClick={() => {
                                                    setUserId(u.id)
                                                    setEmail(u.email || '')
                                                    setUserSuggestions([])
                                                }}
                                            >
                                                <span className="font-medium">{u.name}</span>{' '}
                                                <span className="text-gray-500">{u.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Курс (документ)</label>
                        <input
                            type="text"
                            value={docFilter}
                            onChange={(e) => setDocFilter(e.target.value)}
                            className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Фильтр по названию"
                        />
                        <select
                            value={documentId}
                            onChange={(e) => setDocumentId(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Выберите курс</option>
                            {filteredDocuments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.title}{d.price_rub ? ` — ${d.price_rub} ₽` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Комментарий (опционально)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Причина или заметка для audit_logs"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    {done && (
                        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Доступ выдан</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
                        <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                            {loading ? 'Выдача…' : 'Выдать доступ'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
