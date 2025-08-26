'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, User, Mail, Clock, MessageSquare, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface CallbackRequest {
  id: string
  name: string
  phone: string
  email?: string
  preferred_time?: string
  message?: string
  source_page: string
  status: 'new' | 'contacted' | 'completed' | 'cancelled'
  admin_notes?: string
  contacted_at?: string
  completed_at?: string
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function CallbacksAdminPage() {
  const [requests, setRequests] = useState<CallbackRequest[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
        limit: '20'
      })

      const response = await fetch(`/api/callbacks?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки заявок')
      }

      setRequests(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter, currentPage])

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/callbacks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) {
        throw new Error('Ошибка обновления статуса')
      }

      // Обновляем локальное состояние
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: status as any } : req
      ))
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'contacted':
        return <Phone className="w-4 h-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Новая'
      case 'contacted':
        return 'Связались'
      case 'completed':
        return 'Завершена'
      case 'cancelled':
        return 'Отменена'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка заявок...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Заявки на обратный звонок
          </h1>
          <p className="text-gray-600">
            Управление заявками на обратный звонок
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Все статусы</option>
                <option value="new">Новые</option>
                <option value="contacted">Связались</option>
                <option value="completed">Завершены</option>
                <option value="cancelled">Отменены</option>
              </select>
            </div>

            <div className="ml-auto">
              <Button onClick={fetchRequests} disabled={loading}>
                Обновить
              </Button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Заявок не найдено</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Клиент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Контакты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Детали
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.source_page}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            {request.phone}
                          </div>
                          {request.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              {request.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {request.preferred_time && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="w-4 h-4 text-gray-400 mr-2" />
                              {request.preferred_time}
                            </div>
                          )}
                          {request.message && (
                            <div className="flex items-center text-sm text-gray-500">
                              <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="truncate max-w-xs" title={request.message}>
                                {request.message}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <span className="ml-2 text-sm text-gray-900">
                            {getStatusText(request.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {request.status === 'new' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateStatus(request.id, 'contacted')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Связались
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus(request.id, 'cancelled')}
                              >
                                Отменить
                              </Button>
                            </>
                          )}
                          {request.status === 'contacted' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateStatus(request.id, 'completed')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Завершить
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${request.phone}`)}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Показано {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} из {pagination.total}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setCurrentPage(pagination.page - 1)}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setCurrentPage(pagination.page + 1)}
              >
                Вперед
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
