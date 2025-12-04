'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Filter, Loader2, MessageSquare, RefreshCcw, Search, User } from 'lucide-react'

export interface IssueReply {
  id: string
  issue_id: string
  author_id: string | null
  author_email: string | null
  message: string
  attachments: string[]
  created_at: string
}

export interface IssueRecord {
  id: string
  user_id: string
  user_email: string
  user_name?: string | null
  user_phone?: string | null
  user_telegram_username?: string | null
  purchase_id: string | null
  document_id: string | null
  type: 'access' | 'payment' | 'content' | 'bug' | 'other'
  severity: string
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'
  title: string
  description: string
  context_json: Record<string, unknown>
  url?: string | null
  assignee?: string | null
  created_at: string
  updated_at: string
  first_reply_at?: string | null
  closed_at?: string | null
  issue_replies?: IssueReply[]
}

const STATUS_OPTIONS: IssueRecord['status'][] = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed']
const TYPE_OPTIONS: IssueRecord['type'][] = ['access', 'payment', 'content', 'bug', 'other']
const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700'
}

interface ApiResponse {
  success: boolean
  issues: IssueRecord[]
  total: number
  page: number
  limit: number
  counters: Record<string, number>
}

export default function IssuesDashboard() {
  const [issues, setIssues] = useState<IssueRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [counters, setCounters] = useState<Record<string, number>>({ open: 0, in_progress: 0, waiting_user: 0, resolved: 0, closed: 0 })
  const [selectedIssue, setSelectedIssue] = useState<IssueRecord | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyStatus, setReplyStatus] = useState<IssueRecord['status']>('in_progress')
  const [replyAssignee, setReplyAssignee] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchIssues = async (pageOverride = page) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(pageOverride),
        limit: String(limit)
      })
      if (search) params.set('q', search)
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (assigneeFilter) params.set('assignee', assigneeFilter)

      const res = await fetch(`/api/admin/issues?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const json: ApiResponse = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json as any)
      }
      setIssues(json.issues || [])
      setTotal(json.total || 0)
      setCounters(json.counters || counters)
      setPage(json.page || pageOverride)
    } catch (err) {
      console.error('Issues fetch failed', err)
      setError('Не удалось загрузить обращения')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchIssues(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, assigneeFilter])

  const handleSearch = () => {
    void fetchIssues(1)
  }

  const openReply = (issue: IssueRecord) => {
    setSelectedIssue(issue)
    setReplyMessage('')
    setReplyStatus(issue.status === 'open' ? 'in_progress' : issue.status)
    setReplyAssignee(issue.assignee || '')
  }

  const handleSubmitReply = async () => {
    if (!selectedIssue) return
    if (replyMessage.trim().length < 3) {
      setError('Ответ должен содержать минимум 3 символа')
      return
    }
    setSubmittingReply(true)
    try {
      const res = await fetch(`/api/admin/issues/${selectedIssue.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage,
          status: replyStatus,
          assignee: replyAssignee || undefined
        })
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Ошибка ответа')
      }
      setReplyMessage('')
      setSelectedIssue(json.issue)
      setIssues((prev) => prev.map((issue) => issue.id === json.issue.id ? json.issue : issue))
      void fetchIssues()
    } catch (err) {
      console.error('Reply error', err)
      setError('Не удалось отправить ответ')
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleUpdateStatus = async (issue: IssueRecord, nextStatus: IssueRecord['status'], assignee?: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/issues/${issue.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, assignee })
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Ошибка изменения статуса')
      }
      setIssues((prev) => prev.map((item) => item.id === json.issue.id ? json.issue : item))
      if (selectedIssue?.id === json.issue.id) {
        setSelectedIssue(json.issue)
      }
      void fetchIssues()
    } catch (err) {
      console.error('Status update error', err)
      setError('Не удалось обновить статус')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {STATUS_OPTIONS.slice(0, 4).concat(['closed']).map((status) => (
          <Card key={status} className={status === 'open' ? 'border-blue-200 bg-blue-50' : status === 'in_progress' ? 'border-amber-200 bg-amber-50' : status === 'waiting_user' ? 'border-purple-200 bg-purple-50' : status === 'resolved' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-semibold capitalize">{status.replace('_', ' ')}</CardTitle>
              <CardDescription className="text-2xl font-bold text-gray-900">{counters[status] ?? 0}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Обращения пользователей</CardTitle>
            <CardDescription>Управляйте статусами, назначениями и ответами.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStatusFilter(''); setTypeFilter(''); setAssigneeFilter(''); setSearch(''); void fetchIssues(1) }}>
              <Filter className="mr-2 h-4 w-4" /> Сбросить
            </Button>
            <Button variant="outline" size="sm" onClick={() => void fetchIssues()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="col-span-2 flex gap-2">
              <Input
                placeholder="Поиск по теме, описанию или email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch()
                }}
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Все статусы</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status.replace('_', ' ')}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">Все типы</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <Input
              placeholder="Assignee"
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Тема</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Серьёзность</TableHead>
                  <TableHead>Назначен</TableHead>
                  <TableHead>Создано</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка обращений...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-sm text-gray-500">
                      Обращения не найдены.
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {issue.user_name || issue.user_email}
                          </span>
                          <span className="text-xs text-gray-500">{issue.user_email}</span>
                          {issue.user_phone && (
                            <span className="text-xs text-gray-500">📞 {issue.user_phone}</span>
                          )}
                          {issue.user_telegram_username && (
                            <span className="text-xs text-gray-500">📱 @{issue.user_telegram_username}</span>
                          )}
                          <span className="text-xs text-gray-400">{issue.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={issue.title}>{issue.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{issue.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="capitalize">{issue.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_COLORS[issue.severity] || 'bg-gray-100 text-gray-700'}>{issue.severity}</Badge>
                      </TableCell>
                      <TableCell>{issue.assignee || '-'}</TableCell>
                      <TableCell>{new Date(issue.created_at).toLocaleString('ru-RU')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openReply(issue)}>
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingStatus}
                            onClick={() => handleUpdateStatus(issue, issue.status === 'resolved' ? 'closed' : 'resolved', issue.assignee || undefined)}
                          >
                            {issue.status === 'resolved' ? 'Закрыть' : 'Решено'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Страница {page} из {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => void fetchIssues(page - 1)}
              >
                Назад
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => void fetchIssues(page + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedIssue)} onOpenChange={(open) => { if (!open) setSelectedIssue(null) }}>
        <DialogContent className="max-w-3xl">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedIssue.title}</DialogTitle>
                <DialogDescription>
                  Создано {new Date(selectedIssue.created_at).toLocaleString('ru-RU')} • {selectedIssue.user_name || selectedIssue.user_email}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">{selectedIssue.type}</Badge>
                  <Badge className={SEVERITY_COLORS[selectedIssue.severity] || 'bg-gray-100 text-gray-700'}>{selectedIssue.severity}</Badge>
                  {selectedIssue.status && (
                    <Badge className="capitalize">{selectedIssue.status.replace('_', ' ')}</Badge>
                  )}
                  {selectedIssue.assignee && (
                    <Badge><User className="mr-1 h-3 w-3" /> {selectedIssue.assignee}</Badge>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Информация о пользователе</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Имя:</span>
                        <span>{selectedIssue.user_name || 'Не указано'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <span>{selectedIssue.user_email}</span>
                      </div>
                      {selectedIssue.user_phone && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Телефон:</span>
                          <span>{selectedIssue.user_phone}</span>
                        </div>
                      )}
                      {selectedIssue.user_telegram_username && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Telegram:</span>
                          <span>@{selectedIssue.user_telegram_username}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Описание</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedIssue.description}</p>
                    {selectedIssue.url && (
                      <a className="mt-2 inline-flex items-center text-sm text-blue-600 hover:underline" href={selectedIssue.url} target="_blank" rel="noopener noreferrer">
                        Перейти к проблеме
                      </a>
                    )}
                  </CardContent>
                </Card>

                {selectedIssue.issue_replies && selectedIssue.issue_replies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Ответы</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedIssue.issue_replies.map((reply) => (
                        <div key={reply.id} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                            <span>{reply.author_email || 'Система'}</span>
                            <span>{new Date(reply.created_at).toLocaleString('ru-RU')}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-gray-700">{reply.message}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ответ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Введите ответ пользователю"
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      rows={4}
                    />
                    <div className="grid gap-3 md:grid-cols-3">
                      <select
                        className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                        value={replyStatus}
                        onChange={(event) => setReplyStatus(event.target.value as IssueRecord['status'])}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{status.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="Assignee"
                        value={replyAssignee}
                        onChange={(event) => setReplyAssignee(event.target.value)}
                      />
                    </div>
                  </CardContent>
                  <DialogFooter className="p-4">
                    <Button variant="outline" onClick={() => setSelectedIssue(null)}>Закрыть</Button>
                    <Button onClick={handleSubmitReply} disabled={submittingReply}>
                      {submittingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />} Отправить
                    </Button>
                  </DialogFooter>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
