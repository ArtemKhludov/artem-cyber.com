'use client'

import { useEffect, useState } from 'react'
import { X, ShieldOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RevokeAccessModalProps {
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

export default function RevokeAccessModal({
    isOpen,
    onClose,
    defaultEmail,
    defaultUserId,
    defaultDocumentId,
    onSuccess,
}: RevokeAccessModalProps) {
    const [email, setEmail] = useState<string>(defaultEmail || '')
    const [userId, setUserId] = useState<string>(defaultUserId || '')
    const [documentId, setDocumentId] = useState<string>(defaultDocumentId || '')
    const [reason, setReason] = useState<string>('refund')
    const [documents, setDocuments] = useState<DocumentItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const [notes, setNotes] = useState<string>('')

    useEffect(() => {
        if (isOpen) {
            setEmail(defaultEmail || '')
            setUserId(defaultUserId || '')
            setDocumentId(defaultDocumentId || '')
            setReason('refund')
            setDone(false)
            setError(null)
            setNotes('')
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
        } catch {
            // ignore silently
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!userId) {
            setError('Укажите пользователя (ID)')
            return
        }

        if (!documentId) {
            setError('Выберите курс')
            return
        }
        setLoading(true)
        try {
            const payload: Record<string, unknown> = {
                userId,
                documentId,
                reason,
            }

            if (notes.trim()) {
                payload.notes = notes.trim()
            }

            const res = await fetch('/api/admin/access/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok || json.error) {
                setError(json.error || 'Ошибка отзыва доступа')
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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <ShieldOff className="h-5 w-5 text-red-600" />
                        <h2 className="text-lg font-semibold">Отозвать доступ к курсу</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">ID пользователя</label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="UUID пользователя"
                            required
                        />
                        {email && (
                            <p className="mt-1 text-xs text-gray-500">Email: {email}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Курс (документ)</label>
                        <select
                            value={documentId}
                            onChange={(e) => setDocumentId(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Выберите курс</option>
                            {documents.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.title}{d.price_rub ? ` — ${d.price_rub} ₽` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Причина</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="refund">Возврат</option>
                            <option value="chargeback">Чарджбэк</option>
                            <option value="manual">Ручной отзыв</option>
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
                            <span>Доступ отозван</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
                        <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
                            {loading ? 'Отзыв…' : 'Отозвать доступ'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
