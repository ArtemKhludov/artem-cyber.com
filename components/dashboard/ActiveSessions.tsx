'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  LogOut,
  Shield,
  Wifi,
  WifiOff
} from 'lucide-react'

interface Session {
  id: string
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  user_agent: string
  ip_address: string
  location?: string
  is_current: boolean
  last_activity: string
  created_at: string
}

interface ActiveSessionsProps {
  onLogoutAll?: () => void
}

export function ActiveSessions({ onLogoutAll }: ActiveSessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/auth/sessions', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить сессии')
      }
      
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setError(err instanceof Error ? err.message : 'Не удалось загрузить активные сессии')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop':
        return <Monitor className="h-4 w-4" />
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getDeviceLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop':
        return 'Компьютер'
      case 'mobile':
        return 'Мобильный'
      case 'tablet':
        return 'Планшет'
      default:
        return 'Неизвестное устройство'
    }
  }

  const formatLastActivity = (lastActivity: string) => {
    const now = new Date()
    const activity = new Date(lastActivity)
    const diff = now.getTime() - activity.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) {
      return 'Только что'
    } else if (minutes < 60) {
      return `${minutes} мин назад`
    } else if (hours < 24) {
      return `${hours} ч назад`
    } else {
      return `${days} дн назад`
    }
  }

  const handleLogoutSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId })
      })

      if (response.ok) {
        // Обновляем список сессий
        loadSessions()
      }
    } catch (err) {
      console.error('Failed to logout session:', err)
    }
  }

  const handleLogoutAll = async () => {
    try {
      const response = await fetch('/api/auth/logout-all', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        // Перенаправляем на страницу входа
        window.location.href = '/auth/login'
      }
    } catch (err) {
      console.error('Failed to logout all sessions:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Активные сессии
          </CardTitle>
          <CardDescription>
            Управление устройствами и сессиями
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Активные сессии
          </CardTitle>
          <CardDescription>
            Управление устройствами и сессиями
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-center mb-4">{error}</p>
          <Button onClick={loadSessions} variant="outline">
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Активные сессии
          </CardTitle>
          <CardDescription>
            Управление устройствами и сессиями
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Monitor className="h-12 w-12 mb-4" />
          <p className="text-center">Нет активных сессий</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Активные сессии
        </CardTitle>
        <CardDescription>
          Управление устройствами и сессиями
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                {getDeviceIcon(session.device_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-gray-900">
                    {getDeviceLabel(session.device_type)}
                  </h4>
                  {session.is_current && (
                    <Badge variant="default" className="text-xs">
                      Текущая
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-3 w-3" />
                    <span>IP: {session.ip_address}</span>
                  </div>
                  
                  {session.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{session.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Активность: {formatLastActivity(session.last_activity)}</span>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Создана: {new Date(session.created_at).toLocaleString('ru-RU')}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {!session.is_current && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLogoutSession(session.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-3 w-3 mr-1" />
                    Выйти
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {sessions.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleLogoutAll}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Выйти из всех устройств
            </Button>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Безопасность</p>
              <p className="text-xs mt-1">
                Если вы заметили подозрительную активность, выйдите из всех устройств и смените пароль.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
