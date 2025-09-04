'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Phone,
  FileText,
  ShoppingCart,
  MessageSquare,
  Filter,
  Download,
  Plus,
  Search,
  Calendar,
  User,
  Mail,
  Clock,
  CreditCard,
  Package,
  Trash2,
  Edit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AddRequestModal from '@/components/admin/AddRequestModal'
import AddPurchaseModal from '@/components/admin/AddPurchaseModal'
import EditableCell from '@/components/admin/EditableCell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { useAuth } from '@/contexts/AuthContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Request {
  id: string
  name: string
  email?: string
  phone?: string
  created_at: string
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  notes?: string
  source: 'website' | 'phone' | 'manual' | 'chat' | 'other'
  product_type?: 'pdf' | 'program' | 'consultation' | 'other'
  product_name?: string
  product_id?: string
  request_type?: string
  description?: string
}

interface Purchase {
  id: string
  name: string
  email?: string
  phone?: string
  created_at: string
  product_type: 'pdf' | 'program'
  product_name: string
  product_id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'cancelled'
  payment_method?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  source?: 'website' | 'phone' | 'manual' | 'chat' | 'other'
}

function AdminPageContent() {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'requests' | 'purchases'>('requests')
  const [requests, setRequests] = useState<Request[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddRequestModal, setShowAddRequestModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])

  // Фильтрация данных
  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' ||
      request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.email && request.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.phone && request.phone.includes(searchTerm))

    const matchesType = filter === 'all' || request.product_type === filter
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = searchTerm === '' ||
      purchase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (purchase.email && purchase.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (purchase.phone && purchase.phone.includes(searchTerm))

    const matchesType = filter === 'all' || purchase.product_type === filter
    const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  useEffect(() => {
    // Загружаем данные при первой загрузке
    fetchRequests()
    fetchPurchases()
    fetchDocuments()
  }, [])

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests()
    } else {
      fetchPurchases()
    }
  }, [activeTab, filter, statusFilter, dateFilter])

  const fetchRequests = async () => {
    console.log('Fetching requests...')
    setLoading(true)
    try {
      const response = await fetch('/api/admin/data?type=requests')
      const result = await response.json()

      console.log('API response:', result)

      if (result.success) {
        const requestsWithType = result.data?.map((req: any) => ({
          ...req,
          type: 'callback'
        })) || []

        console.log('Setting requests:', requestsWithType)
        setRequests(requestsWithType)
      } else {
        console.error('API error:', result.error)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchases = async () => {
    console.log('Fetching purchases...')
    setLoading(true)
    try {
      const response = await fetch('/api/admin/data?type=purchases')
      const result = await response.json()

      console.log('API response purchases:', result)

      if (result.success) {
        setPurchases(result.data || [])
      } else {
        console.error('API error purchases:', result.error)
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/admin/data?type=documents')
      const result = await response.json()

      if (result.success) {
        setDocuments(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status,
          type: 'request'
        })
      })

      const result = await response.json()

      if (result.success) {
        setRequests(prev =>
          prev.map(req =>
            req.id === id ? { ...req, status: status as any } : req
          )
        )
      } else {
        console.error('Error updating status:', result.error)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const updatePurchaseStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status,
          type: 'purchase'
        })
      })

      const result = await response.json()

      if (result.success) {
        setPurchases(prev =>
          prev.map(pur =>
            pur.id === id ? { ...pur, status: status as any } : pur
          )
        )
      } else {
        console.error('Error updating purchase status:', result.error)
      }
    } catch (error) {
      console.error('Error updating purchase status:', error)
    }
  }

  const updateField = async (id: string, field: string, value: any, type: 'request' | 'purchase') => {
    try {
      const response = await fetch('/api/admin/update-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          field,
          value,
          type
        })
      })

      const result = await response.json()

      if (result.success) {
        if (type === 'request') {
          setRequests(prev =>
            prev.map(req =>
              req.id === id ? { ...req, [field]: value } : req
            )
          )
        } else {
          setPurchases(prev =>
            prev.map(pur =>
              pur.id === id ? { ...pur, [field]: value } : pur
            )
          )
        }
      } else {
        console.error('Error updating field:', result.error)
      }
    } catch (error) {
      console.error('Error updating field:', error)
    }
  }

  const syncWithSheets = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'all' })
      })

      if (response.ok) {
        alert('Синхронизация с Google Sheets завершена успешно!')
      } else {
        alert('Ошибка синхронизации с Google Sheets')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Ошибка синхронизации')
    } finally {
      setSyncing(false)
    }
  }

  // Функция для удаления заявки или покупки
  const deleteItem = async (id: string, type: 'request' | 'purchase') => {
    if (!confirm(`Вы уверены, что хотите удалить эту ${type === 'request' ? 'заявку' : 'покупку'}?`)) {
      return
    }

    try {
      console.log('Deleting item:', { type, id })

      // Проверяем, что тип корректный
      if (type !== 'request' && type !== 'purchase') {
        console.error('Invalid type:', type)
        alert('Ошибка: неверный тип данных')
        return
      }

      const response = await fetch(`/api/admin/data?type=${type}&id=${id}`, {
        method: 'DELETE',
      })

      const responseData = await response.json()
      console.log('Delete response:', responseData)

      if (response.ok) {
        alert(`${type === 'request' ? 'Заявка' : 'Покупка'} удалена успешно!`)
        // Обновляем данные
        if (type === 'request') {
          fetchRequests()
        } else {
          fetchPurchases()
        }
      } else {
        console.error('Delete failed:', responseData)
        alert(`Ошибка удаления: ${responseData.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Ошибка удаления: ' + error.message)
    }
  }

  // Функция для обновления заявки или покупки
  const updateItem = async (id: string, type: 'request' | 'purchase', data: any) => {
    try {
      console.log('Updating item:', { type, id, data })

      // Проверяем, что тип корректный
      if (type !== 'request' && type !== 'purchase') {
        console.error('Invalid type:', type)
        alert('Ошибка: неверный тип данных')
        return
      }

      const response = await fetch('/api/admin/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, id, data })
      })

      const responseData = await response.json()
      console.log('Update response:', responseData)

      if (response.ok) {
        alert(`${type === 'request' ? 'Заявка' : 'Покупка'} обновлена успешно!`)
        // Обновляем данные
        if (type === 'request') {
          fetchRequests()
        } else {
          fetchPurchases()
        }
      } else {
        console.error('Update failed:', responseData)
        alert(`Ошибка обновления: ${responseData.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Ошибка обновления: ' + error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'low':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'website':
        return <Package className="w-3 h-3 text-blue-400" />
      case 'phone':
        return <Phone className="w-3 h-3 text-green-400" />
      case 'chat':
        return <MessageSquare className="w-3 h-3 text-purple-400" />
      case 'manual':
        return <User className="w-3 h-3 text-orange-400" />
      default:
        return <FileText className="w-3 h-3 text-gray-400" />
    }
  }

  const exportToCSV = () => {
    const data = activeTab === 'requests' ? requests : purchases
    const headers = activeTab === 'requests'
      ? ['ID', 'Имя', 'Email', 'Телефон', 'Дата', 'Статус', 'Приоритет', 'Источник', 'Товар']
      : ['ID', 'Имя', 'Email', 'Телефон', 'Дата', 'Товар', 'Сумма', 'Статус', 'Способ оплаты']

    const csvContent = [
      headers.join(','),
      ...data.map(item => {
        if (activeTab === 'requests') {
          const req = item as Request
          return [
            req.id,
            req.name,
            req.email || '',
            req.phone || '',
            new Date(req.created_at).toLocaleDateString('ru-RU'),
            req.status,
            req.priority,
            req.source,
            req.product_name || ''
          ].join(',')
        } else {
          const pur = item as Purchase
          return [
            pur.id,
            pur.name,
            pur.email || '',
            pur.phone || '',
            new Date(pur.created_at).toLocaleDateString('ru-RU'),
            pur.product_name,
            pur.amount,
            pur.status,
            pur.payment_method || ''
          ].join(',')
        }
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${activeTab === 'requests' ? 'заявки' : 'покупки'}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }





  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">CRM Система</h1>
              <p className="text-white/70 mt-1">Управление заявками и покупками</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <User className="w-4 h-4 mr-2" />
                Выйти
              </Button>
              <Button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт CSV
              </Button>
              <Button
                onClick={() => {
                  console.log('Button clicked!')
                  if (activeTab === 'requests') {
                    console.log('Calling fetchRequests...')
                    fetchRequests()
                  } else {
                    console.log('Calling fetchPurchases...')
                    fetchPurchases()
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white mr-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Обновить {activeTab === 'requests' ? 'заявки' : 'покупки'}
              </Button>
              <Button
                onClick={() => activeTab === 'requests' ? setShowAddRequestModal(true) : setShowAddPurchaseModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить {activeTab === 'requests' ? 'заявку' : 'покупку'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'requests'
                ? 'bg-white text-gray-900'
                : 'text-white hover:bg-white/10'
                }`}
            >
              <div className="flex items-center justify-center">
                <Phone className="w-4 h-4 mr-2" />
                Заявки ({requests.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'purchases'
                ? 'bg-white text-gray-900'
                : 'text-white hover:bg-white/10'
                }`}
            >
              <div className="flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Покупки ({purchases.length})
              </div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Поиск по ${activeTab === 'requests' ? 'заявкам' : 'покупкам'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <AddPurchaseModal
                isOpen={showAddPurchaseModal}
                onClose={() => setShowAddPurchaseModal(false)}
                onSuccess={() => {
                  console.log('Purchase added, refreshing...')
                  setShowAddPurchaseModal(false)
                  if (activeTab === 'purchases') {
                    fetchPurchases()
                  }
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="completed">Завершенные</option>
              <option value="cancelled">Отмененные</option>
              {activeTab === 'purchases' && (
                <>
                  <option value="pending">Ожидает оплаты</option>
                </>
              )}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все даты</option>
              <option value="today">Сегодня</option>
              <option value="week">За неделю</option>
              <option value="month">За месяц</option>
            </select>

            {/* Type Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все типы</option>
              {activeTab === 'requests' ? (
                <>
                  <option value="callback">Звонки</option>
                  <option value="pdf">PDF файлы</option>
                  <option value="program">Программы</option>
                  <option value="consultation">Консультации</option>
                </>
              ) : (
                <>
                  <option value="pdf">PDF файлы</option>
                  <option value="program">Программы</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="flex items-center">
              {activeTab === 'requests' ? (
                <Phone className="w-8 h-8 text-blue-400 mr-3" />
              ) : (
                <ShoppingCart className="w-8 h-8 text-green-400 mr-3" />
              )}
              <div>
                <p className="text-white/70 text-sm">
                  {activeTab === 'requests' ? 'Всего заявок' : 'Всего покупок'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {activeTab === 'requests' ? requests.length : purchases.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-400 mr-3" />
              <div>
                <p className="text-white/70 text-sm">Новые</p>
                <p className="text-2xl font-bold text-white">
                  {activeTab === 'requests'
                    ? requests.filter(r => r.status === 'new').length
                    : purchases.filter(p => p.status === 'pending').length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-green-400 mr-3" />
              <div>
                <p className="text-white/70 text-sm">
                  {activeTab === 'requests' ? 'В работе' : 'Завершенные'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {activeTab === 'requests'
                    ? requests.filter(r => r.status === 'in_progress').length
                    : purchases.filter(p => p.status === 'completed').length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-purple-400 mr-3" />
              <div>
                <p className="text-white/70 text-sm">
                  {activeTab === 'requests' ? 'Завершенные' : 'Общая сумма'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {activeTab === 'requests'
                    ? requests.filter(r => r.status === 'completed').length
                    : `${purchases.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)} ₽`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-white/70 mt-2">
                Загрузка {activeTab === 'requests' ? 'заявок' : 'покупок'}...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Клиент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Контакты
                    </th>
                    {activeTab === 'requests' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Товар/Услуга
                      </th>
                    )}
                    {activeTab === 'purchases' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Товар
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Статус
                    </th>
                    {activeTab === 'requests' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Приоритет
                      </th>
                    )}
                    {activeTab === 'purchases' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Сумма
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Источник
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {(activeTab === 'requests' ? filteredRequests : filteredPurchases).map((item) => (
                    <tr key={item.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <EditableCell
                            value={item.name}
                            onSave={(newValue) => updateItem(item.id, activeTab === 'requests' ? 'request' : 'purchase', { name: newValue })}
                            className="text-sm font-medium text-white"
                          />
                          <div className="text-sm text-white/70">
                            ID: {item.id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {item.email && (
                            <div className="flex items-center mb-1">
                              <Mail className="w-3 h-3 mr-1 text-white/50" />
                              <EditableCell
                                value={item.email}
                                onSave={(newValue) => updateItem(item.id, activeTab === 'requests' ? 'request' : 'purchase', { email: newValue })}
                                className="text-white"
                              />
                            </div>
                          )}
                          {item.phone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-white/50" />
                              <EditableCell
                                value={item.phone}
                                onSave={(newValue) => updateItem(item.id, activeTab === 'requests' ? 'request' : 'purchase', { phone: newValue })}
                                className="text-white"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      {activeTab === 'requests' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {item.product_name || 'Не указан'}
                        </td>
                      )}
                      {activeTab === 'purchases' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          <div className="flex items-center">
                            {item.product_type === 'pdf' ? (
                              <FileText className="w-4 h-4 mr-2 text-blue-400" />
                            ) : (
                              <Package className="w-4 h-4 mr-2 text-green-400" />
                            )}
                            {item.product_name}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {new Date(item.created_at).toLocaleDateString('ru-RU')}
                        <br />
                        <span className="text-white/50">
                          {new Date(item.created_at).toLocaleTimeString('ru-RU')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTab === 'requests' ? (
                          <select
                            value={item.status}
                            onChange={(e) => updateRequestStatus(item.id, e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)} border-0 focus:ring-2 focus:ring-blue-500`}
                          >
                            <option value="new">Новый</option>
                            <option value="completed">Завершен</option>
                            <option value="cancelled">Отменен</option>
                          </select>
                        ) : (
                          <EditableCell
                            value={item.status}
                            type="select"
                            options={[
                              { value: 'pending', label: 'Ожидает оплаты' },
                              { value: 'completed', label: 'Оплачено' },
                              { value: 'cancelled', label: 'Отменено' }
                            ]}
                            onSave={(newValue) => updateItem(item.id, 'purchase', { status: newValue })}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}
                          />
                        )}
                      </td>
                      {activeTab === 'requests' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <EditableCell
                            value={item.priority || 'medium'}
                            type="select"
                            options={[
                              { value: 'urgent', label: 'Срочно' },
                              { value: 'high', label: 'Высокий' },
                              { value: 'medium', label: 'Средний' },
                              { value: 'low', label: 'Низкий' }
                            ]}
                            onSave={(newValue) => updateItem(item.id, 'request', { priority: newValue })}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority || 'medium')}`}
                          />
                        </td>
                      )}
                      {activeTab === 'purchases' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          <EditableCell
                            value={'amount' in item ? item.amount : 0}
                            type="number"
                            onSave={(newValue) => updateItem(item.id, 'purchase', { amount: newValue })}
                            className="text-white font-medium"
                          />
                          <span className="ml-1">₽</span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-white">
                          {getSourceIcon(item.source || 'other')}
                          <span className="ml-1">
                            {item.source === 'website' && 'Сайт'}
                            {item.source === 'phone' && 'Телефон'}
                            {item.source === 'chat' && 'Чат'}
                            {item.source === 'manual' && 'Ручной ввод'}
                            {item.source === 'other' && 'Другое'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              // Просмотр - можно добавить модальное окно
                              alert(`Просмотр ${activeTab === 'requests' ? 'заявки' : 'покупки'} ID: ${item.id}`)
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Просмотр
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => deleteItem(item.id, activeTab === 'requests' ? 'request' : 'purchase')}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Удалить
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
      </div>

      {/* Add Request Modal */}
      <AddRequestModal
        isOpen={showAddRequestModal}
        onClose={() => setShowAddRequestModal(false)}
        onSuccess={() => {
          console.log('Request added, refreshing...')
          setShowAddRequestModal(false)
          if (activeTab === 'requests') {
            fetchRequests()
          }
        }}
      />

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        isOpen={showAddPurchaseModal}
        onClose={() => setShowAddPurchaseModal(false)}
        onSuccess={() => {
          console.log('Purchase added, refreshing...')
          setShowAddPurchaseModal(false)
          if (activeTab === 'purchases') {
            fetchPurchases()
          }
        }}
      />
    </div>
  )
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  )
}
