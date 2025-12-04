'use client'

import { useEffect, useMemo, useState } from 'react'

interface Point { day: string; value: number }

export default function ChartsBlock() {
    const [windowDays, setWindowDays] = useState(30)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<any>(null)

    const fetchMetrics = async (wd: number) => {
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/admin/metrics?windowDays=${wd}`)
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Ошибка загрузки метрик')
            setData(json)
        } catch (e: any) {
            setError(e?.message || 'Ошибка загрузки')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchMetrics(windowDays) }, [windowDays])

    const width = 520
    const height = 160
    const padding = 24

    const makePath = (series: Point[]) => {
        if (!series || series.length === 0) return ''
        const values = series.map(p => p.value)
        const max = Math.max(1, ...values)
        const stepX = (width - padding * 2) / Math.max(1, series.length - 1)
        const scaleY = (val: number) => height - padding - (val / max) * (height - padding * 2)
        let d = ''
        series.forEach((p, i) => {
            const x = padding + i * stepX
            const y = scaleY(p.value)
            d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
        })
        return d
    }

    const revenuePath = useMemo(() => makePath(data?.revenueSeries || []), [data])
    const refundsPath = useMemo(() => makePath(data?.refundsSeries || []), [data])
    const grantedPath = useMemo(() => makePath(data?.accessGrantedSeries || []), [data])
    const revokedPath = useMemo(() => makePath(data?.accessRevokedSeries || []), [data])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">Выручка / Возвраты</h3>
                    <select
                        value={windowDays}
                        onChange={(e) => setWindowDays(Number(e.target.value))}
                        className="px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm"
                    >
                        {[7, 14, 30, 60, 90].map(n => (<option key={n} value={n}>{n} дней</option>))}
                    </select>
                </div>
                {loading ? (
                    <p className="text-white/70 text-sm">Загрузка...</p>
                ) : error ? (
                    <p className="text-red-300 text-sm">{error}</p>
                ) : (
                    <svg width={width} height={height} className="w-full max-w-full">
                        <path d={revenuePath} stroke="#34d399" strokeWidth="2" fill="none" />
                        <path d={refundsPath} stroke="#f87171" strokeWidth="2" fill="none" />
                    </svg>
                )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-white font-semibold mb-3">Выдачи / Отзывы доступа</h3>
                {loading ? (
                    <p className="text-white/70 text-sm">Загрузка...</p>
                ) : error ? (
                    <p className="text-red-300 text-sm">{error}</p>
                ) : (
                    <svg width={width} height={height} className="w-full max-w-full">
                        <path d={grantedPath} stroke="#60a5fa" strokeWidth="2" fill="none" />
                        <path d={revokedPath} stroke="#a78bfa" strokeWidth="2" fill="none" />
                    </svg>
                )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-white font-semibold mb-3">Воронка</h3>
                {loading || !data ? (
                    <p className="text-white/70 text-sm">Загрузка...</p>
                ) : (
                    <div className="flex gap-4 text-white">
                        <div className="flex-1 bg-white/10 rounded p-3 text-center">
                            <div className="text-xs text-white/60">Начали</div>
                            <div className="text-2xl font-bold">{data.funnel?.started || 0}</div>
                        </div>
                        <div className="flex-1 bg-white/10 rounded p-3 text-center">
                            <div className="text-xs text-white/60">Оплатили</div>
                            <div className="text-2xl font-bold">{data.funnel?.paid || 0}</div>
                        </div>
                        <div className="flex-1 bg-white/10 rounded p-3 text-center">
                            <div className="text-xs text-white/60">Получили доступ</div>
                            <div className="text-2xl font-bold">{data.funnel?.access || 0}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-white font-semibold mb-3">Аномалии</h3>
                {loading || !data ? (
                    <p className="text-white/70 text-sm">Загрузка...</p>
                ) : (
                    <ul className="text-white/90 text-sm">
                        <li>Застрявшие pending (&gt;24ч): {data.anomalies?.stuckPending || 0}</li>
                        <li>Оплачено без активного доступа: {data.anomalies?.completedNoAccess || 0}</li>
                    </ul>
                )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-white font-semibold mb-3">Топ курсов (выручка)</h3>
                {loading || !data ? (
                    <p className="text-white/70 text-sm">Загрузка...</p>
                ) : (
                    <ul className="text-white/90 text-sm">
                        {(data.topRevenueCourses || []).map((c: any) => (
                            <li key={c.document_id} className="flex justify-between"><span>{c.document_id}</span><span>{c.amount}</span></li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-white font-semibold mb-3">Топ курсов (активные доступы)</h3>
                {loading || !data ? (
                    <p className="text-white/70 text-sm">Загрузка...</p>
                ) : (
                    <ul className="text-white/90 text-sm">
                        {(data.topAccessCourses || []).map((c: any) => (
                            <li key={c.document_id} className="flex justify-between"><span>{c.document_id}</span><span>{c.count}</span></li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}


