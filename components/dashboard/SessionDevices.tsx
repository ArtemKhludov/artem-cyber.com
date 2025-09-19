'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, LogOut } from 'lucide-react'

interface SessionItem {
  token: string
  createdAt: string
  lastActivity: string | null
  expiresAt: string
  revokedAt: string | null
  rememberMe: boolean | null
  ipAddress: string | null
  userAgent: string | null
  isCurrent: boolean
}

const formatDateTime = (value: string | null, fallback = '—') => {
  if (!value) return fallback
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return fallback
  }
}

export function SessionDevices() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyToken, setBusyToken] = useState<string | 'all' | 'others' | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/sessions', { credentials: 'include' })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Не удалось получить список сессий' }))
        setError(data.error || 'Не удалось получить список сессий')
        setSessions([])
        return
      }

      const data = await response.json()
      setSessions(data.sessions || [])
      setError('')
    } catch (err) {
      console.error('Failed to load sessions', err)
      setError('Ошибка загрузки сессий')
    } finally {
      setLoading(false)
      setBusyToken(null)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const revoke = async (payload: Record<string, unknown>) => {
    try {
      const scope = (payload.scope as string | undefined) ?? (payload.sessionToken ? 'single' : undefined)
      setBusyToken((payload.sessionToken as string) ?? (scope as 'all' | 'others' | null))

      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Не удалось завершить сессию' }))
        setError(data.error || 'Не удалось завершить сессию')
      }

      await loadSessions()
    } catch (err) {
      console.error('Failed to revoke session', err)
      setError('Ошибка завершения сессии')
      setBusyToken(null)
    }
  }

  if (!sessions.length && loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Устройства</CardTitle>
          <CardDescription>Подождите, загружаем активные сессии…</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Активные сессии</CardTitle>
          <CardDescription>Завершите доступ на устройствах, которые вам не знакомы</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busyToken === 'others' || loading || sessions.length <= 1}
            onClick={() => revoke({ scope: 'others' })}
          >
            Завершить другие
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busyToken === 'all' || loading}
            onClick={() => revoke({ scope: 'all' })}
          >
            Завершить все
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {sessions.length === 0 && !loading ? (
          <p className="text-sm text-gray-500">Активных сессий не найдено.</p>
        ) : (
          sessions.map(session => {
            const isBusy = busyToken === session.token
            return (
              <div
                key={session.token}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {session.isCurrent ? 'Текущая сессия' : 'Сессия'}
                    </span>
                    {session.isCurrent ? (
                      <Badge variant="secondary">Активно</Badge>
                    ) : session.rememberMe ? (
                      <Badge variant="outline">Запомнить меня</Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-500">
                    IP: {session.ipAddress || '—'}
                    {session.userAgent ? ` · ${session.userAgent.slice(0, 80)}` : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    Последняя активность: {formatDateTime(session.lastActivity, 'нет данных')}
                  </div>
                  <div className="text-xs text-gray-500">
                    Истекает: {formatDateTime(session.expiresAt)}
                  </div>
                  {session.revokedAt && (
                    <div className="text-xs text-red-500">
                      Завершена: {formatDateTime(session.revokedAt)}
                    </div>
                  )}
                </div>
                {!session.isCurrent && !session.revokedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy || loading}
                    onClick={() => revoke({ sessionToken: session.token })}
                    className="self-start sm:self-auto"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Завершение…
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-3 w-3" /> Завершить
                      </>
                    )}
                  </Button>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
