'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  BookOpen, 
  FileText, 
  PlayCircle, 
  Download,
  Eye,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { loadRecentActivity, type RecentActivityRecord } from '@/lib/recent-activity'

interface RecentlyViewedProps {
  onReportIssue?: (context: any) => void
}

export function RecentlyViewed({ onReportIssue }: RecentlyViewedProps) {
  const [recentActivity, setRecentActivity] = useState<RecentActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadActivity = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const activity = await loadRecentActivity()
      setRecentActivity(activity)
    } catch (err) {
      console.error('Failed to load recent activity:', err)
      setError('Не удалось загрузить историю активности')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="h-4 w-4" />
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'video':
        return <PlayCircle className="h-4 w-4" />
      case 'download':
        return <Download className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'course':
        return 'Курс'
      case 'document':
        return 'Документ'
      case 'video':
        return 'Видео'
      case 'download':
        return 'Скачивание'
      default:
        return 'Просмотр'
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) {
      return `${minutes} мин назад`
    } else if (hours < 24) {
      return `${hours} ч назад`
    } else {
      return `${days} дн назад`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Недавно просмотренные
          </CardTitle>
          <CardDescription>
            История вашей активности на платформе
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
            <Clock className="h-5 w-5" />
            Недавно просмотренные
          </CardTitle>
          <CardDescription>
            История вашей активности на платформе
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-center mb-4">{error}</p>
          <Button onClick={loadActivity} variant="outline">
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (recentActivity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Недавно просмотренные
          </CardTitle>
          <CardDescription>
            История вашей активности на платформе
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mb-4" />
          <p className="text-center">У вас пока нет активности</p>
          <p className="text-center text-sm mt-2">
            Начните изучать курсы, чтобы увидеть историю здесь
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Недавно просмотренные
        </CardTitle>
        <CardDescription>
          История вашей активности на платформе
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div
              key={`${activity.type}-${activity.id}-${activity.timestamp}`}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {activity.title}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {getActivityLabel(activity.type)}
                  </Badge>
                </div>
                
                {activity.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {activity.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(activity.timestamp).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {activity.url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={activity.url} target="_blank" rel="noopener noreferrer">
                      Открыть
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {recentActivity.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Очистить историю
                localStorage.removeItem('recent_activity')
                loadActivity()
              }}
              className="w-full"
            >
              Очистить историю
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
