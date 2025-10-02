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
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  DollarSign,
  Shield,
  AlertTriangle
} from 'lucide-react'
import * as Toast from '@radix-ui/react-toast'
import { Button } from '@/components/ui/button'
import AddRequestModal from '@/components/admin/AddRequestModal'
import AddPurchaseModal from '@/components/admin/AddPurchaseModal'
import EditableCell from '@/components/admin/EditableCell'
import UserCard from '@/components/admin/UserCard'
import { UserProfileModal } from '@/components/admin/UserProfileModal'
import { EnhancedUsersList } from '@/components/admin/EnhancedUsersList'
import ChartsBlock from '@/components/admin/ChartsBlock'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { CoursesManagement } from '@/components/admin/CoursesManagement'
import { PricingManagement } from '@/components/admin/PricingManagement'
import { AdminGuard } from '@/components/auth/AdminGuard'
import LogsViewer from '@/components/admin/LogsViewer'
import RevokeAccessModal from '@/components/admin/RevokeAccessModal'
import GrantAccessModal from '@/components/admin/GrantAccessModal'
import { useAuth } from '@/contexts/AuthContext'
import IssuesDashboard from '@/components/admin/IssuesDashboard'
import IssuesQuickWidget from '@/components/admin/IssuesQuickWidget'

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
  const [activeTab, setActiveTab] = useState<'requests' | 'purchases' | 'payments' | 'users' | 'courses' | 'pricing' | 'logs' | 'issues'>('requests')
  const [requests, setRequests] = useState<Request[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddRequestModal, setShowAddRequestModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false)
  const [showUserCard, setShowUserCard] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [selectedUserProfileId, setSelectedUserProfileId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [showGrantAccess, setShowGrantAccess] = useState(false)
  const [grantDefaults, setGrantDefaults] = useState<{ email?: string; userId?: string; documentId?: string }>({})
  const [showRevokeAccess, setShowRevokeAccess] = useState(false)
  const [revokeDefaults, setRevokeDefaults] = useState<{ email?: string; userId?: string; documentId?: string }>({})

  // Toast state
  const [toastOpen, setToastOpen] = useState(false)
  const [toastData, setToastData] = useState<{ title: string; description?: string; variant?: 'success' | 'error' } | null>(null)
  const showToast = (title: string, description?: string, variant?: 'success' | 'error') => {
    setToastData({ title, description, variant })
    setToastOpen(true)
  }

  // Recent grants/revokes
  const [recentEvents, setRecentEvents] = useState<Array<{ id: string; action?: string; created_at?: string; actor_email?: string; target_table?: string; target_id?: string }>>([])
  const [recentLoading, setRecentLoading] = useState(false)

  // Состояния для сортировки
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  // Выбор элементов для пакетных действий (только для Покупок)
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<string>>(new Set())
  // View helpers
  const resetFilters = () => {
    setSearchTerm('')
    setFilter('all')
    setStatusFilter('all')
    setDateFilter('all')
    setSortField('created_at')
    setSortDirection('desc')
    showToast('Фильтры сброшены')
  }
  const saveView = () => {
    try {
      const params = new URLSearchParams(window.location.search)
      localStorage.setItem('admin_saved_view', params.toString())
      showToast('Вид сохранён', 'Вы сможете восстановить его позже')
    } catch {
      showToast('Не удалось сохранить вид', undefined, 'error')
    }
  }
  const runReconcile = async () => {
    try {
      const res = await fetch('/api/admin/payments/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ windowMinutes: 15 }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error) {
        showToast('Reconcile ошибка', json.error || 'Неизвестная ошибка', 'error')
      } else {
        showToast('Reconcile выполнен', `Проверено: ${json.checked}`, 'success')
        fetchPurchases()
      }
    } catch (e) {
      showToast('Reconcile ошибка', 'Сетевая ошибка', 'error')
    }
  }

  // Функция для сортировки данных
  const sortData = (data: any[], field: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      let aValue = a[field]
      let bValue = b[field]

      // Обработка разных типов данных
      if (field === 'created_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (field === 'amount') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })
  }

  // Функция для обработки клика по заголовку
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Функция для отображения иконки сортировки
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />
  }

  // Фильтрация и сортировка данных
  const filteredRequests = sortData(
    requests.filter(request => {
      const matchesSearch = searchTerm === '' ||
        request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.email && request.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.phone && request.phone.includes(searchTerm))

      const matchesType = filter === 'all' || request.product_type === filter
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    }),
    sortField,
    sortDirection
  )

  // Пагинация (клиентская) для таблиц
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  useEffect(() => { setPage(1) }, [activeTab, searchTerm, filter, statusFilter, dateFilter])
  const paginate = (list: any[]) => {
    const start = (page - 1) * pageSize
    return list.slice(start, start + pageSize)
  }
  // Перенесено ниже, после объявления filteredPurchases и filteredUsers

  const filteredPurchases = sortData(
    purchases.filter(purchase => {
      const matchesSearch = searchTerm === '' ||
        purchase.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (purchase.email && purchase.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (purchase.phone && purchase.phone.includes(searchTerm))

      const matchesType = filter === 'all' || purchase.product_type === filter
      const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    }),
    sortField,
    sortDirection
  )

  const allSelected = filteredPurchases.length > 0 && filteredPurchases.every((p: any) => selectedPurchaseIds.has(p.id))
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPurchaseIds(new Set())
    } else {
      setSelectedPurchaseIds(new Set(filteredPurchases.map((p: any) => p.id)))
    }
  }
  const toggleSelectOne = (id: string) => {
    setSelectedPurchaseIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const bulkGrant = async () => {
    if (selectedPurchaseIds.size === 0) return
    if (!confirm(`Выдать доступ по ${selectedPurchaseIds.size} запись(ям)?`)) return
    let ok = 0; let fail = 0
    for (const id of selectedPurchaseIds) {
      const item = filteredPurchases.find((p: any) => p.id === id)
      if (!item) { fail++; continue }
      const payload: any = { documentId: item.product_id }
      if (item.user_id) payload.userId = item.user_id; else if (item.email) payload.email = item.email
      try {
        const res = await fetch('/api/admin/access/grant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }
    showToast('Пакетная выдача завершена', `Успех: ${ok}, Ошибки: ${fail}`, fail ? 'error' : 'success')
    setSelectedPurchaseIds(new Set())
    fetchPurchases()
  }

  const bulkRevoke = async () => {
    if (selectedPurchaseIds.size === 0) return
    if (!confirm(`Отозвать доступ по ${selectedPurchaseIds.size} запись(ям)?`)) return
    let ok = 0; let fail = 0
    for (const id of selectedPurchaseIds) {
      const item = filteredPurchases.find((p: any) => p.id === id)
      if (!item || !item.user_id || !item.product_id) { fail++; continue }
      const payload: any = { userId: item.user_id, documentId: item.product_id, reason: 'manual' }
      try {
        const res = await fetch('/api/admin/access/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }
    showToast('Пакетный отзыв завершён', `Успех: ${ok}, Ошибки: ${fail}`, fail ? 'error' : 'success')
    setSelectedPurchaseIds(new Set())
    fetchPurchases()
  }

  // Totals for Purchases (based on current filters)
  const purchasesTotalCount = filteredPurchases.length
  const purchasesTotalAmount = filteredPurchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  // Быстрые счётчики по статусам для Покупок
  const purchasesPendingCount = purchases.filter(p => p.status === 'pending').length
  const purchasesCompletedCount = purchases.filter(p => p.status === 'completed').length
  const purchasesCancelledCount = purchases.filter(p => p.status === 'cancelled').length

  const filteredUsers = sortData(
    users.filter(user => {
      const matchesSearch = searchTerm === '' ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.phone && user.phone.includes(searchTerm))

      return matchesSearch
    }),
    sortField,
    sortDirection
  )

  // Показатели и страницы (после инициализации всех filtered-списков)
  const totalRows = activeTab === 'requests'
    ? filteredRequests.length
    : activeTab === 'purchases'
      ? filteredPurchases.length
      : activeTab === 'users'
        ? filteredUsers.length
        : 0
  const totalPages = Math.max(1, Math.ceil(Math.max(totalRows, 1) / pageSize))
  const visibleRows = activeTab === 'requests'
    ? paginate(filteredRequests)
    : activeTab === 'purchases'
      ? paginate(filteredPurchases)
      : activeTab === 'users'
        ? paginate(filteredUsers)
        : []

  useEffect(() => {
    // Загружаем данные при первой загрузке
    fetchRequests()
    fetchPurchases()
    fetchDocuments()
  }, [])

  // Синхронизация состояния фильтров/сортировки с URL
  useEffect(() => {
    // Инициализация из URL один раз
    const params = new URLSearchParams(window.location.search)
    const s = params.get('s'); if (s !== null) setSearchTerm(s)
    const f = params.get('f'); if (f !== null) setFilter(f)
    const sf = params.get('sf'); if (sf !== null) setStatusFilter(sf)
    const df = params.get('df'); if (df !== null) setDateFilter(df)
    const sortF = params.get('sort'); if (sortF !== null) setSortField(sortF)
    const sortD = params.get('dir') as 'asc' | 'desc' | null; if (sortD === 'asc' || sortD === 'desc') setSortDirection(sortD)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (searchTerm) params.set('s', searchTerm); else params.delete('s')
    if (filter !== 'all') params.set('f', filter); else params.delete('f')
    if (statusFilter !== 'all') params.set('sf', statusFilter); else params.delete('sf')
    if (dateFilter !== 'all') params.set('df', dateFilter); else params.delete('df')
    if (sortField) params.set('sort', sortField)
    if (sortDirection) params.set('dir', sortDirection)
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }, [searchTerm, filter, statusFilter, dateFilter, sortField, sortDirection])

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests()
    } else if (activeTab === 'purchases') {
      fetchPurchases()
    } else if (activeTab === 'payments') {
      fetchPayments()
    } else if (activeTab === 'users') {
      fetchUsers()
    }
  }, [activeTab, filter, statusFilter, dateFilter])

  useEffect(() => {
    // fetch recent grants/revokes (best-effort)
    const fetchRecent = async () => {
      setRecentLoading(true)
      try {
        const res = await fetch('/api/admin/audit/recent')
        const json = await res.json().catch(() => ({}))
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setRecentEvents(json.data)
        } else {
          setRecentEvents([])
        }
      } catch {
        setRecentEvents([])
      } finally {
        setRecentLoading(false)
      }
    }
    fetchRecent()
  }, [])

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

  const fetchUsers = async () => {
    console.log('Fetching users...')
    setLoading(true)
    try {
      const response = await fetch('/api/users/enhanced')
      const result = await response.json()

      if (result.success) {
        setUsers(result.data || [])
        console.log('Users loaded:', result.data?.length || 0)
      } else {
        console.error('Error loading users:', result.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const openUserCard = (userId: string) => {
    setSelectedUserId(userId)
    setShowUserCard(true)
  }

  const closeUserCard = () => {
    setShowUserCard(false)
    setSelectedUserId(null)
  }

  const openUserProfile = (userId: string) => {
    setSelectedUserProfileId(userId)
    setShowUserProfileModal(true)
  }

  const closeUserProfile = () => {
    setShowUserProfileModal(false)
    setSelectedUserProfileId(null)
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

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/admin/data?type=payments')
      const result = await response.json()
      if (result.success) {
        setPayments(result.data || [])
      }
    } catch (error) {
      // ignore
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
        showToast('Синхронизация завершена', 'Google Sheets обновлены', 'success')
      } else {
        showToast('Ошибка синхронизации', 'Не удалось обновить Google Sheets', 'error')
      }
    } catch (error) {
      console.error('Sync error:', error)
      showToast('Ошибка синхронизации', 'Сетевой сбой или внутренняя ошибка', 'error')
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
        showToast('Удалено', `${type === 'request' ? 'Заявка' : 'Покупка'} удалена`, 'success')
        // Обновляем данные
        if (type === 'request') {
          fetchRequests()
        } else {
          fetchPurchases()
        }
      } else {
        console.error('Delete failed:', responseData)
        showToast('Ошибка удаления', responseData.error || 'Неизвестная ошибка', 'error')
      }
    } catch (error) {
      console.error('Delete error:', error)
      showToast('Ошибка удаления', error instanceof Error ? error.message : 'Неизвестная ошибка', 'error')
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
        showToast('Обновлено', `${type === 'request' ? 'Заявка' : 'Покупка'} обновлена`, 'success')
        // Обновляем данные
        if (type === 'request') {
          fetchRequests()
        } else {
          fetchPurchases()
        }
      } else {
        console.error('Update failed:', responseData)
        showToast('Ошибка обновления', responseData.error || 'Неизвестная ошибка', 'error')
      }
    } catch (error) {
      console.error('Update error:', error)
      showToast('Ошибка обновления', error instanceof Error ? error.message : 'Неизвестная ошибка', 'error')
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
    <ErrorBoundary>
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
                  onClick={resetFilters}
                  variant="outline"
                  className="text-white border-white/30"
                >
                  Сбросить фильтры
                </Button>
                {activeTab !== 'issues' && (
                  <Button
                    onClick={exportToCSV}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Экспорт CSV
                  </Button>
                )}
                <Button
                  onClick={saveView}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  Сохранить вид
                </Button>
                {activeTab !== 'issues' && (
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
                )}
                <Button
                  onClick={runReconcile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Запустить reconcile
                </Button>
                <Button
                  onClick={() => setActiveTab('logs')}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  Логи
                </Button>
                {activeTab !== 'issues' && (
                  <Button
                    onClick={() => activeTab === 'requests' ? setShowAddRequestModal(true) : setShowAddPurchaseModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить {activeTab === 'requests' ? 'заявку' : 'покупку'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <IssuesQuickWidget />
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
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users'
                  ? 'bg-white text-gray-900'
                  : 'text-white hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center justify-center">
                  <Users className="w-4 h-4 mr-2" />
                  Пользователи ({users.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'issues'
                  ? 'bg-white text-gray-900'
                  : 'text-white hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Обращения
                </div>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'payments'
                  ? 'bg-white text-gray-900'
                  : 'text-white hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center justify-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Платежи ({payments.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('courses')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'courses'
                  ? 'bg-white text-gray-900'
                  : 'text-white hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Курсы
                </div>
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'pricing'
                  ? 'bg-white text-gray-900'
                  : 'text-white hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center justify-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Цены
                </div>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'logs'
                  ? 'bg-white text-gray-900'
                  : 'text-white hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center justify-center">
                  Логи
                </div>
              </button>
            </div>
          </div>

          {activeTab === 'issues' ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
              <IssuesDashboard />
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder={`Поиск по ${activeTab === 'requests' ? 'заявкам' : activeTab === 'purchases' ? 'покупкам' : 'пользователям'}...`}
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

                {/* Быстрые фильтры по статусу для Покупок */}
                {activeTab === 'purchases' && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === 'all' ? 'bg-white text-gray-900 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                    >
                      Все ({purchases.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('pending')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === 'pending' ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30'}`}
                    >
                      Ожидает оплаты ({purchasesPendingCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === 'completed' ? 'bg-green-400 text-black border-green-400' : 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30'}`}
                    >
                      Оплачено ({purchasesCompletedCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('cancelled')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${statusFilter === 'cancelled' ? 'bg-red-400 text-black border-red-400' : 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'}`}
                    >
                      Отменено ({purchasesCancelledCount})
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="flex items-center">
                    {activeTab === 'requests' ? (
                      <Phone className="w-8 h-8 text-blue-400 mr-3" />
                    ) : activeTab === 'purchases' ? (
                      <ShoppingCart className="w-8 h-8 text-green-400 mr-3" />
                    ) : (
                      <Users className="w-8 h-8 text-purple-400 mr-3" />
                    )}
                    <div>
                      <p className="text-white/70 text-sm">
                        {activeTab === 'requests' ? 'Всего заявок' : activeTab === 'purchases' ? 'Всего покупок' : 'Всего пользователей'}
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {activeTab === 'requests' ? requests.length : activeTab === 'purchases' ? purchases.length : users.length}
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
                          : purchasesPendingCount
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
                          : purchasesCompletedCount
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="flex items-center">
                    {activeTab === 'purchases' ? (
                      <AlertTriangle className="w-8 h-8 text-red-400 mr-3" />
                    ) : (
                      <CreditCard className="w-8 h-8 text-purple-400 mr-3" />
                    )}
                    <div>
                      <p className="text-white/70 text-sm">
                        {activeTab === 'requests' ? 'Завершенные' : 'Отмененные'}
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {activeTab === 'requests'
                          ? requests.filter(r => r.status === 'completed').length
                          : purchasesCancelledCount
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <ChartsBlock />

              {/* Панель пакетных действий и последние события */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:col-span-1">
                  <h3 className="text-white font-semibold mb-3">Последние выдачи/отзывы</h3>
                  {recentLoading ? (
                    <p className="text-white/70 text-sm">Загрузка…</p>
                  ) : recentEvents.length === 0 ? (
                    <p className="text-white/50 text-sm">Нет событий</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                      {recentEvents.slice(0, 10).map((ev) => (
                        <li key={ev.id} className="text-sm text-white/90 flex items-start gap-2">
                          <span className={`mt-1 inline-block h-2 w-2 rounded-full ${ev.action?.toLowerCase().includes('revoke') ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                          <div>
                            <div className="">
                              {ev.action || 'event'} {ev.target_table ? `• ${ev.target_table}` : ''}
                            </div>
                            <div className="text-white/50 text-xs">
                              {ev.actor_email || ''} {ev.created_at ? `• ${new Date(ev.created_at).toLocaleString('ru-RU')}` : ''}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {activeTab === 'purchases' && selectedPurchaseIds.size > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-white">Выбрано записей: {selectedPurchaseIds.size}</div>
                      <div className="flex gap-2">
                        <Button onClick={bulkGrant} className="bg-emerald-600 hover:bg-emerald-700 text-white">Выдать доступ</Button>
                        <Button onClick={bulkRevoke} className="bg-red-600 hover:bg-red-700 text-white">Отозвать доступ</Button>
                        <Button variant="outline" onClick={() => setSelectedPurchaseIds(new Set())} className="text-white border-white/30">Сбросить выбор</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
                {activeTab === 'courses' ? (
                  <CoursesManagement />
                ) : activeTab === 'pricing' ? (
                  <PricingManagement />
                ) : activeTab === 'logs' ? (
                  <LogsViewer />
                ) : loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-white/70 mt-2">
                      Загрузка {activeTab === 'requests' ? 'заявок' : activeTab === 'purchases' ? 'покупок' : 'пользователей'}...
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/20">
                        <tr>
                          {activeTab === 'purchases' && (
                            <th className="px-3 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                            </th>
                          )}
                          {activeTab === 'users' ? (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Пользователь
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Телефон
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Заявки
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Покупки
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Потрачено
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Регистрация
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Последняя активность
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Действия
                              </th>
                            </>
                          ) : activeTab === 'payments' ? (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Пользователь</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Документ</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Дата</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Статус</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Сумма</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Действия</th>
                            </>
                          ) : (
                            <>
                              <th
                                className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                                onClick={() => handleSort('name')}
                              >
                                <div className="flex items-center">
                                  Клиент
                                  {getSortIcon('name')}
                                </div>
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Контакты
                              </th>
                            </>
                          )}
                          {activeTab === 'requests' && (
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                              onClick={() => handleSort('product_name')}
                            >
                              <div className="flex items-center">
                                Товар/Услуга
                                {getSortIcon('product_name')}
                              </div>
                            </th>
                          )}
                          {activeTab === 'requests' && (
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                              onClick={() => handleSort('source_page')}
                            >
                              <div className="flex items-center">
                                Источник
                                {getSortIcon('source_page')}
                              </div>
                            </th>
                          )}
                          {activeTab === 'purchases' && (
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                              onClick={() => handleSort('product_name')}
                            >
                              <div className="flex items-center">
                                Товар
                                {getSortIcon('product_name')}
                              </div>
                            </th>
                          )}
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                            onClick={() => handleSort('created_at')}
                          >
                            <div className="flex items-center">
                              Дата
                              {getSortIcon('created_at')}
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center">
                              Статус
                              {getSortIcon('status')}
                            </div>
                          </th>
                          {activeTab === 'requests' && (
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                              onClick={() => handleSort('priority')}
                            >
                              <div className="flex items-center">
                                Приоритет
                                {getSortIcon('priority')}
                              </div>
                            </th>
                          )}
                          {activeTab === 'purchases' && (
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                              onClick={() => handleSort('amount')}
                            >
                              <div className="flex items-center">
                                Сумма
                                {getSortIcon('amount')}
                              </div>
                            </th>
                          )}
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider cursor-pointer hover:bg-white/30 transition-colors"
                            onClick={() => handleSort('source')}
                          >
                            <div className="flex items-center">
                              Источник
                              {getSortIcon('source')}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {activeTab === 'users' ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-4">
                              <div className="bg-white rounded-lg p-4">
                                <EnhancedUsersList
                                  onUserSelect={(user) => openUserCard(user.id)}
                                  onUserEdit={(user) => openUserCard(user.id)}
                                  onUserDelete={async (userId) => {
                                    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
                                      try {
                                        const response = await fetch(`/api/users/${userId}`, {
                                          method: 'DELETE'
                                        })
                                        if (response.ok) {
                                          fetchUsers()
                                        }
                                      } catch (error) {
                                        console.error('Error deleting user:', error)
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ) : activeTab === 'payments' ? (
                          paginate(sortData(payments, sortField, sortDirection)).map((pmt: any) => (
                            <tr key={pmt.id} className="hover:bg-white/5">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {pmt.user_email || pmt.user_id}
                                <div className="text-white/50 text-xs">ID: {pmt.id.slice(0, 8)}...</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{pmt.document_id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {new Date(pmt.created_at).toLocaleDateString('ru-RU')}
                                <div className="text-white/50 text-xs">{new Date(pmt.created_at).toLocaleTimeString('ru-RU')}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pmt.payment_status)}`}>{pmt.payment_status}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                                {pmt.amount_paid || 0}
                                <span className="ml-1">{pmt.currency || 'RUB'}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                <div className="flex items-center space-x-2">
                                  {pmt.stripe_payment_intent_id && (
                                    <a
                                      href={`https://dashboard.stripe.com/search?query=${encodeURIComponent(pmt.stripe_payment_intent_id)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-300 hover:underline"
                                    >
                                      Открыть в Stripe
                                    </a>
                                  )}
                                  <button
                                    className="text-white/80 hover:text-white underline"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/admin/audit/purchase?id=${pmt.id}`)
                                        const json = await res.json()
                                        if (res.ok && json.success) {
                                          const lines = (json.data as any[]).map(ev => `${new Date(ev.created_at).toLocaleString('ru-RU')} • ${ev.action}${ev.actor_email ? ' • ' + ev.actor_email : ''}`).join('\n')
                                          alert(lines || 'Нет событий')
                                        } else {
                                          alert('Нет событий')
                                        }
                                      } catch {
                                        alert('Ошибка загрузки таймлайна')
                                      }
                                    }}
                                  >
                                    Таймлайн
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          (activeTab === 'requests' ? visibleRows : activeTab === 'purchases' ? visibleRows : visibleRows).map((item: any) => (
                            <tr key={item.id} className="hover:bg-white/5">
                              {activeTab === 'purchases' && (
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <input type="checkbox" checked={selectedPurchaseIds.has(item.id)} onChange={() => toggleSelectOne(item.id)} />
                                </td>
                              )}
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
                              {activeTab === 'requests' && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                  <div className="flex items-center">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {item.source_page === '/' ? 'Главная' :
                                        item.source_page === '/about' ? 'О проекте' :
                                          item.source_page === '/contacts' ? 'Контакты' :
                                            item.source_page === '/catalog' ? 'Каталог' :
                                              item.source_page === '/book' ? 'Программы' :
                                                item.source_page || 'Не указан'}
                                    </span>
                                  </div>
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
                                  {activeTab === 'purchases' && (
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => {
                                        setGrantDefaults({ email: item.email, userId: item.user_id, documentId: item.product_id })
                                        setShowGrantAccess(true)
                                      }}
                                    >
                                      Выдать доступ
                                    </Button>
                                  )}
                                  {activeTab === 'purchases' && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                      onClick={() => {
                                        setRevokeDefaults({ email: item.email, userId: item.user_id, documentId: item.product_id })
                                        setShowRevokeAccess(true)
                                      }}
                                    >
                                      Отозвать доступ
                                    </Button>
                                  )}
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
                          ))
                        )}
                      </tbody>
                    </table>
                    {/* Пагинация */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white/10 border-t border-white/10">
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <span>Показывать по</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="bg-transparent border border-white/30 rounded px-2 py-1"
                        >
                          {[10, 20, 50, 100].map(n => (<option key={n} value={n}>{n}</option>))}
                        </select>
                        <span>Всего: {totalRows}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="text-white border-white/30" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Назад</Button>
                        <span className="text-white/80 text-sm">Стр. {page} из {totalPages}</span>
                        <Button variant="outline" className="text-white border-white/30" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Вперёд</Button>
                      </div>
                    </div>
                    {activeTab === 'purchases' && (
                      <div className="bg-white/10">
                        <table className="w-full">
                          <tfoot>
                            <tr>
                              <td className="px-6 py-3 text-sm font-semibold text-white" colSpan={5}>
                                Итого записей: {purchasesTotalCount}
                              </td>
                              <td className="px-6 py-3 text-sm font-semibold text-white">
                                {purchasesTotalAmount} ₽
                              </td>
                              <td className="px-6 py-3" colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
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

        {/* User Card Modal */}
        {selectedUserId && (
          <UserCard
            userId={selectedUserId}
            isOpen={showUserCard}
            onClose={closeUserCard}
          />
        )}

        {/* Grant Access Modal */}
        <GrantAccessModal
          isOpen={showGrantAccess}
          onClose={() => setShowGrantAccess(false)}
          defaultEmail={grantDefaults.email}
          defaultUserId={grantDefaults.userId}
          defaultDocumentId={grantDefaults.documentId}
          onSuccess={() => {
            if (activeTab === 'purchases') fetchPurchases()
          }}
        />

        <RevokeAccessModal
          isOpen={showRevokeAccess}
          onClose={() => setShowRevokeAccess(false)}
          defaultEmail={revokeDefaults.email}
          defaultUserId={revokeDefaults.userId}
          defaultDocumentId={revokeDefaults.documentId}
          onSuccess={() => {
            if (activeTab === 'purchases') fetchPurchases()
          }}
        />

        {/* User Profile Modal */}
        {showUserProfileModal && selectedUserProfileId && (
          <UserProfileModal
            isOpen={showUserProfileModal}
            onClose={closeUserProfile}
            userId={selectedUserProfileId}
          />
        )}

        {/* Toasts */}
        <Toast.Provider swipeDirection="right">
          <Toast.Root
            open={toastOpen}
            onOpenChange={setToastOpen}
            duration={3500}
            className={`rounded-md shadow-lg px-4 py-3 border text-sm backdrop-blur-sm ${toastData?.variant === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100'}`}
          >
            {toastData?.title && <Toast.Title className="font-semibold">{toastData.title}</Toast.Title>}
            {toastData?.description && <Toast.Description className="mt-0.5 text-white/80">{toastData.description}</Toast.Description>}
          </Toast.Root>
          <Toast.Viewport className="fixed bottom-4 right-4 z-[60] w-[360px] max-w-[calc(100%-2rem)] outline-none" />
        </Toast.Provider>
      </div >
    </ErrorBoundary>
  )
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  )
}
