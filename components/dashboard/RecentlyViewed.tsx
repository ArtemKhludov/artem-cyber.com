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
import { clearRecentActivityStorage, loadRecentActivity, type RecentActivityRecord } from '@/lib/recent-activity'

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
      setError('Failed to load activity history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  const getActivityIcon = (activity: RecentActivityRecord) => {
    if (activity.action === 'download') {
      return <Download className="h-4 w-4" />
    }

    const normalizedType = activity.materialType?.toLowerCase?.() ?? ''

    if (normalizedType.includes('video')) {
      return <PlayCircle className="h-4 w-4" />
    }

    if (normalizedType.includes('document') || normalizedType.includes('pdf')) {
      return <FileText className="h-4 w-4" />
    }

    if (normalizedType.includes('course')) {
      return <BookOpen className="h-4 w-4" />
    }

    return <Eye className="h-4 w-4" />
  }

  const getActivityLabel = (activity: RecentActivityRecord) => {
    if (activity.action === 'download') {
      return 'Download'
    }

    const normalizedType = activity.materialType?.toLowerCase?.() ?? ''

    if (normalizedType.includes('video')) {
      return 'Video'
    }

    if (normalizedType.includes('document') || normalizedType.includes('pdf')) {
      return 'Document'
    }

    if (normalizedType.includes('course')) {
      return 'Course'
    }

    return 'View'
  }

  const formatTimeAgo = (occurredAt: string) => {
    const timestamp = Date.parse(occurredAt)
    if (Number.isNaN(timestamp)) {
      return 'Recently'
    }

    const now = Date.now()
    const diff = Math.max(0, now - timestamp)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) {
      return `${minutes} min ago`
    }

    if (hours < 24) {
      return `${hours} h ago`
    }

    return `${days} days ago`
  }

  const formatDate = (occurredAt: string) => {
    const date = new Date(occurredAt)
    if (Number.isNaN(date.getTime())) {
      return '-'
    }
    return date.toLocaleDateString('en-US')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recently viewed
          </CardTitle>
          <CardDescription>
            Your activity history on the platform
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
            Recently viewed
          </CardTitle>
          <CardDescription>
            Your activity history on the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-center mb-4">{error}</p>
          <Button onClick={loadActivity} variant="outline">
            Retry
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
            Recently viewed
          </CardTitle>
          <CardDescription>
            Your activity history on the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mb-4" />
          <p className="text-center">No activity yet</p>
          <p className="text-center text-sm mt-2">
            Start learning to see your history here
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
          Recently viewed
        </CardTitle>
        <CardDescription>
          Your activity history on the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                {getActivityIcon(activity)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {activity.materialTitle}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {getActivityLabel(activity)}
                  </Badge>
                </div>
                
                {activity.courseTitle && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {activity.courseTitle}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(activity.occurredAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(activity.occurredAt)}
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {activity.url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={activity.url} target="_blank" rel="noopener noreferrer">
                      Open
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
                clearRecentActivityStorage()
                loadActivity()
              }}
              className="w-full"
            >
              Clear History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
