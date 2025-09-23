'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, MessageSquare } from 'lucide-react'

interface QuickIssue {
  id: string
  title: string
  status: string
  severity: string
  user_email: string
  created_at: string
}

export default function IssuesQuickWidget() {
  const [issues, setIssues] = useState<QuickIssue[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/issues?limit=5&page=1')
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || 'Ошибка загрузки')
        }
        setIssues(json.issues || [])
      } catch (err) {
        console.error('Issues quick widget error', err)
        setError('Нет данных')
      }
    }
    void load()
  }, [])

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white/90">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white">
          <MessageSquare className="h-4 w-4" /> Последние обращения
        </CardTitle>
        <CardDescription className="text-xs text-white/60">Последние 5 обращений пользователей</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {error ? (
          <div className="flex items-center gap-2 text-white/70">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        ) : issues.length === 0 ? (
          <p className="text-white/60 text-sm">Обращений пока нет</p>
        ) : (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2">
                <div>
                  <p className="font-medium text-white truncate max-w-[180px]" title={issue.title}>{issue.title}</p>
                  <p className="text-xs text-white/60">{new Date(issue.created_at).toLocaleString('ru-RU')}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="capitalize">{issue.status.replace('_', ' ')}</Badge>
                  <Badge className="text-xs capitalize">{issue.severity}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
