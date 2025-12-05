'use client'

import { useEffect, useState } from 'react'

type LogItem = {
    id: string
    created_at: string
    action: string
    actor_email?: string | null
    target_table?: string | null
    target_id?: string | null
    metadata?: any
}

export default function LogsViewer() {
    const [items, setItems] = useState<LogItem[]>([])
    const [actor, setActor] = useState('')
    const [action, setAction] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (actor) params.set('actor', actor)
            if (action) params.set('action', action)
            params.set('limit', '200')
            const res = await fetch(`/api/admin/audit/list?${params.toString()}`)
            const json = await res.json()
            if (!res.ok || json.error) throw new Error(json.error || 'Load failed')
            setItems(json.data || [])
        } catch (e: any) {
            setError(e?.message || 'Error loading logs')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { void load() }, [])

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="mb-4 flex gap-2">
                <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="actor email" className="px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/50" />
                <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="action" className="px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/50" />
                <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white">Refresh</button>
            </div>
            {loading ? <div className="text-white/80 text-sm">Loading...</div> : error ? <div className="text-red-300 text-sm">{error}</div> : (
                <div className="max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="text-white/60">
                            <tr>
                                <th className="px-2 py-1 text-left">Time</th>
                                <th className="px-2 py-1 text-left">Action</th>
                                <th className="px-2 py-1 text-left">Actor</th>
                                <th className="px-2 py-1 text-left">Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it) => (
                                <tr key={it.id} className="border-t border-white/10 text-white/90">
                                    <td className="px-2 py-1 whitespace-nowrap">{new Date(it.created_at).toLocaleString('ru-RU')}</td>
                                    <td className="px-2 py-1">{it.action}</td>
                                    <td className="px-2 py-1">{it.actor_email || ''}</td>
                                    <td className="px-2 py-1 truncate">{it.target_table || ''} {it.target_id ? `• ${it.target_id}` : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}


