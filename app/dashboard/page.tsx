'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertCircle,
  BookOpen,
  Download,
  Info,
  Star,
  Trophy,
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  Gift,
  Award,
  Target,
  TrendingUp,
  Volume2
} from 'lucide-react'
import { SessionDevices } from '@/components/dashboard/SessionDevices'
import { initPostHog } from '@/lib/posthog'

type PurchaseStatus =
  | 'completed'
  | 'active'
  | 'in_progress'
  | 'pending'
  | 'expired'
  | 'revoked'
  | 'failed'

type AccessStatus = 'active' | 'revoked' | 'expired' | 'pending'

interface PurchaseAccessMeta {
  id?: string | null
  status: AccessStatus
  granted_at?: string | null
  expires_at?: string | null
  revoked_at?: string | null
}

interface Purchase {
  id: string
  product_name: string
  product_type: 'mini_course' | 'pdf' | 'session'
  price: number
  status: PurchaseStatus
  payment_status?: 'completed' | 'pending' | 'failed' | 'requires_action'
  created_at: string
  progress?: number
  document?: {
    id: string
    title: string
    description: string
    cover_url: string
    course_type: 'pdf' | 'mini_course'
    has_workbook: boolean
    has_videos: boolean
    has_audio: boolean
    video_count: number
    workbook_count: number
    course_duration_minutes: number
  }
  pdf_url?: string
  receipt_url?: string | null
  session_date?: string
  session_time?: string
  access?: PurchaseAccessMeta | null
}

const PURCHASE_STATUS_META: Record<PurchaseStatus, {
  label: string
  badgeClass: string
  allowActions: boolean
  hint: string
  tone: 'info' | 'warning' | 'danger'
  allowRetry?: boolean
  supportReason?: string
}> = {
  completed: {
    label: 'Завершено',
    badgeClass: 'bg-green-100 text-green-800',
    allowActions: true,
    hint: 'Доступ к материалам открыт.',
    tone: 'info'
  },
  active: {
    label: 'Активно',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    allowActions: true,
    hint: 'У вас активный доступ к материалам.',
    tone: 'info'
  },
  in_progress: {
    label: 'В обработке',
    badgeClass: 'bg-blue-100 text-blue-800',
    allowActions: false,
    hint: 'Платёж обрабатывается. Обновите страницу через пару минут — доступ появится автоматически.',
    tone: 'info',
    allowRetry: true,
    supportReason: 'Платёж завис в статусе «В обработке»'
  },
  pending: {
    label: 'Ожидание оплаты',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    allowActions: false,
    hint: 'Оплата ещё не завершена. Завершите платёж, чтобы открыть материалы.',
    tone: 'warning',
    allowRetry: true,
    supportReason: 'Оплата отображается как «Ожидание», но доступ не открылся'
  },
  expired: {
    label: 'Доступ истёк',
    badgeClass: 'bg-orange-100 text-orange-800',
    allowActions: false,
    hint: 'Срок доступа закончился. Оформите продление или напишите в поддержку, если нужен дополнительный доступ.',
    tone: 'warning',
    allowRetry: true,
    supportReason: 'Просьба продлить или восстановить доступ к материалам'
  },
  revoked: {
    label: 'Доступ отозван',
    badgeClass: 'bg-red-100 text-red-800',
    allowActions: false,
    hint: 'Доступ был отозван. Свяжитесь с поддержкой, если это неожиданно.',
    tone: 'danger',
    supportReason: 'Доступ к материалам был отозван'
  },
  failed: {
    label: 'Ошибка оплаты',
    badgeClass: 'bg-rose-100 text-rose-800',
    allowActions: false,
    hint: 'Оплата не прошла. Проверьте данные карты и попробуйте снова. Если проблема сохраняется, напишите в поддержку.',
    tone: 'danger',
    allowRetry: true,
    supportReason: 'Оплата не проходит, нужна помощь'
  }
}

const STATUS_HINT_TONE_STYLES: Record<'info' | 'warning' | 'danger', string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700'
}

interface Course {
  id: string
  title: string
  description: string
  progress: number
  total_lessons: number
  completed_lessons: number
  thumbnail: string
  duration: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  course_type: 'pdf' | 'mini_course'
  has_workbook: boolean
  has_videos: boolean
  has_audio: boolean
  video_count: number
  workbook_count: number
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalCourses: 0,
    completedCourses: 0,
    totalSpent: 0
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilterValue, setStatusFilterValue] = useState<'all' | PurchaseStatus>('all')
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ id: string; title: string; type: string; href?: string; ts: number }>>([])

  const track = (event: string, props?: Record<string, unknown>) => {
    const ph = initPostHog()
    ph?.capture(event, props)
  }

  useEffect(() => {
    if (user) {
      // Загружаем данные пользователя
      loadUserData()
    }
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('el_recently_viewed')
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ id: string; title: string; type: string; href?: string; ts: number }>
        setRecentlyViewed(parsed)
      }
    } catch { }
  }, [])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const response = await fetch('/api/user/dashboard', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases)

        // Преобразуем курсы из покупок
        const courseData = data.courses.map((purchase: any) => ({
          id: purchase.id,
          title: purchase.document?.title || purchase.product_name,
          description: purchase.document?.description || 'Купленный курс',
          progress: purchase.progress || 0,
          total_lessons: purchase.document?.course_type === 'mini_course' ?
            (purchase.document?.workbook_count || 0) + (purchase.document?.video_count || 0) + 1 : 1,
          completed_lessons: Math.floor((purchase.progress || 0) / 100 *
            (purchase.document?.course_type === 'mini_course' ?
              (purchase.document?.workbook_count || 0) + (purchase.document?.video_count || 0) + 1 : 1)),
          thumbnail: purchase.document?.cover_url || '/api/placeholder/300/200',
          duration: purchase.document?.course_duration_minutes ?
            `${Math.floor(purchase.document.course_duration_minutes / 60)}ч ${purchase.document.course_duration_minutes % 60}м` : 'Не указано',
          difficulty: 'beginner' as const,
          course_type: purchase.document?.course_type || 'pdf',
          has_workbook: purchase.document?.has_workbook || false,
          has_videos: purchase.document?.has_videos || false,
          has_audio: purchase.document?.has_audio || false,
          video_count: purchase.document?.video_count || 0,
          workbook_count: purchase.document?.workbook_count || 0
        }))

        setCourses(courseData)
        setStats(data.stats)
      } else {
        setErrorMessage('Не удалось загрузить покупки. Попробуйте ещё раз чуть позже.')
        // Если API недоступен, используем моковые данные
        setPurchases([
          {
            id: '1',
            product_name: 'Mini-сессия',
            product_type: 'session',
            price: 4999,
            status: 'completed',
            payment_status: 'completed',
            created_at: '2024-01-15',
            progress: 100,
            pdf_url: 'https://example.com/session-report.pdf',
            receipt_url: 'https://example.com/session-receipt.pdf'
          },
          {
            id: '2',
            product_name: 'Глубокий день',
            product_type: 'session',
            price: 24999,
            status: 'in_progress',
            payment_status: 'pending',
            created_at: '2024-01-20',
            progress: 65,
            receipt_url: null
          },
          {
            id: '3',
            product_name: 'Продвинутые техники работы с подсознанием',
            product_type: 'pdf',
            price: 14990,
            status: 'active',
            payment_status: 'completed',
            created_at: '2023-12-10',
            progress: 80,
            access: {
              status: 'active',
              granted_at: '2023-12-10T10:00:00Z',
              expires_at: '2024-12-31T23:59:59Z'
            },
            receipt_url: 'https://example.com/course-receipt.pdf',
            document: {
              id: 'doc-3',
              title: 'Продвинутые техники работы с подсознанием',
              description: 'Глубокие методы проработки внутренних блоков',
              cover_url: '/api/placeholder/300/200',
              course_type: 'pdf',
              has_workbook: false,
              has_videos: false,
              has_audio: true,
              video_count: 0,
              workbook_count: 0,
              course_duration_minutes: 90
            }
          }
        ])

        setCourses([
          {
            id: '1',
            title: 'Основы трансформации личности',
            description: 'Изучите базовые принципы изменения мышления и поведения',
            progress: 75,
            total_lessons: 12,
            completed_lessons: 9,
            thumbnail: '/api/placeholder/300/200',
            duration: '2 часа',
            difficulty: 'beginner',
            course_type: 'mini_course',
            has_workbook: true,
            has_videos: true,
            has_audio: false,
            video_count: 5,
            workbook_count: 3
          },
          {
            id: '2',
            title: 'Продвинутые техники работы с подсознанием',
            description: 'Глубокие методы проработки внутренних блоков',
            progress: 30,
            total_lessons: 8,
            completed_lessons: 2,
            thumbnail: '/api/placeholder/300/200',
            duration: '3 часа',
            difficulty: 'advanced',
            course_type: 'pdf',
            has_workbook: false,
            has_videos: false,
            has_audio: true,
            video_count: 0,
            workbook_count: 0
          },
          {
            id: '3',
            title: 'Продвинутые техники работы с подсознанием',
            description: 'Доступ активен до конца года',
            progress: 80,
            total_lessons: 10,
            completed_lessons: 8,
            thumbnail: '/api/placeholder/300/200',
            duration: '1 час 30 минут',
            difficulty: 'intermediate',
            course_type: 'pdf',
            has_workbook: false,
            has_videos: false,
            has_audio: true,
            video_count: 0,
            workbook_count: 0
          }
        ])

        setStats({
          totalPurchases: 3,
          totalCourses: 3,
          completedCourses: 1,
          totalSpent: 44988
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setErrorMessage('Произошла ошибка при загрузке данных. Проверьте подключение и попробуйте снова.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    void loadUserData()
    track('dashboard_retry_click')
  }

  const handleRetryAccess = (purchaseId: string) => {
    console.info('Повторный запрос доступа для покупки', purchaseId)
    setRetryCount((prev) => prev + 1)
    void loadUserData()
    track('dashboard_access_retry_click', { purchaseId })
  }

  const handleExportPurchases = () => {
    if (typeof window === 'undefined') return
    if (filteredPurchases.length === 0) {
      console.info('Нет покупок для экспорта')
      return
    }

    const header = ['ID', 'Название', 'Тип', 'Статус', 'Дата', 'Сумма']
    const rows = filteredPurchases.map((purchase) => {
      const effectiveStatus = (purchase.access?.status ?? purchase.status) as PurchaseStatus
      const statusLabel = getPurchaseStatusMeta(effectiveStatus).label
      const purchaseDate = new Date(purchase.created_at).toLocaleDateString('ru-RU')

      return [
        purchase.id,
        purchase.product_name,
        getProductTypeLabel(purchase.product_type),
        statusLabel,
        purchaseDate,
        purchase.price.toFixed(2)
      ]
    })

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `energylogic-purchases-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    track('dashboard_purchases_export', { count: filteredPurchases.length })
  }

  const handleDownloadReceipt = (purchase: Purchase) => {
    if (typeof window === 'undefined') return

    const receiptUrl = purchase.receipt_url || purchase.pdf_url
    if (receiptUrl) {
      window.open(receiptUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const subject = `Запрос чека по покупке ${purchase.product_name}`
    const bodyLines = [
      `Здравствуйте! Прошу отправить чек по покупке ${purchase.product_name} (ID ${purchase.id}) от ${new Date(purchase.created_at).toLocaleDateString('ru-RU')}.`,
      '',
      `Данные для идентификации: статус ${getPurchaseStatusMeta((purchase.access?.status ?? purchase.status) as PurchaseStatus).label}.`
    ]
    const body = bodyLines.join('\n')

    window.location.href = `mailto:support@energylogic.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'mini_course': return 'Мини-курс'
      case 'pdf': return 'Курс'
      case 'session': return 'Энергетическая диагностика'
      default: return type
    }
  }

  const handleOpenClick = (purchase: Purchase) => {
    // Track and persist Recently Viewed
    track('dashboard_open_click', { id: purchase.id, type: purchase.product_type })
    try {
      const key = 'el_recently_viewed'
      const prev = JSON.parse(localStorage.getItem(key) || '[]') as any[]
      const item = {
        id: purchase.document?.id || purchase.id,
        title: purchase.product_name,
        type: purchase.product_type,
        href: purchase.product_type === 'session' ? `/download/${purchase.id}` : purchase.document?.id ? `/courses/${purchase.document.id}/player` : undefined,
        ts: Date.now()
      }
      const next = [item, ...prev.filter((x) => x.href !== item.href)].slice(0, 12)
      localStorage.setItem(key, JSON.stringify(next))
      setRecentlyViewed(next)
    } catch { }
  }

  const handleSupportClick = (purchase?: Purchase) => {
    track('dashboard_support_click', purchase ? { purchaseId: purchase.id } : undefined)
  }

  const handleReportIssue = (purchase: Purchase) => {
    track('dashboard_report_issue_click', { id: purchase.id })
    const subject = `Сообщение о проблеме: ${purchase.product_name}`
    const bodyLines = [
      `Покупка: ${purchase.product_name} (ID ${purchase.id})`,
      `Статус: ${getPurchaseStatusMeta((purchase.access?.status ?? purchase.status) as PurchaseStatus).label}`,
      `Дата: ${new Date(purchase.created_at).toLocaleDateString('ru-RU')}`,
      '',
      'Опишите проблему:'
    ]
    window.location.href = `mailto:support@energylogic.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`
  }

  const UNKNOWN_STATUS_META = {
    label: 'Статус неизвестен',
    badgeClass: 'bg-gray-100 text-gray-800',
    allowActions: false,
    hint: 'Статус заказа не распознан. Обновите страницу или свяжитесь с поддержкой.',
    tone: 'warning' as const
  }

  const getPurchaseStatusMeta = (status: string) => {
    return PURCHASE_STATUS_META[status as PurchaseStatus] ?? UNKNOWN_STATUS_META
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null
    try {
      return new Date(isoString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    } catch (error) {
      console.warn('Не удалось форматировать дату истечения доступа', isoString, error)
      return null
    }
  }

  const statusFilterOptions = useMemo(() => {
    return [
      { value: 'all' as const, label: 'Все статусы' },
      ...Object.entries(PURCHASE_STATUS_META).map(([value, meta]) => ({
        value: value as PurchaseStatus,
        label: meta.label
      }))
    ]
  }, [])

  const filteredPurchases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return purchases.filter((purchase) => {
      const effectiveStatus = (purchase.access?.status ?? purchase.status) as PurchaseStatus
      const matchesStatus = statusFilterValue === 'all' || effectiveStatus === statusFilterValue

      if (!matchesStatus) return false

      if (normalizedSearch.length === 0) {
        return true
      }

      const searchableTokens = [
        purchase.product_name,
        purchase.id,
        purchase.document?.title,
        purchase.document?.description
      ]
        .filter(Boolean)
        .map((token) => (token ?? '').toString().toLowerCase())

      return searchableTokens.some((token) => token.includes(normalizedSearch))
    })
  }, [purchases, statusFilterValue, searchTerm])

  const filteredTotal = useMemo(() => {
    return filteredPurchases.reduce((sum, purchase) => sum + (purchase.price || 0), 0)
  }, [filteredPurchases])

  const filteredTotalFormatted = useMemo(() => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(filteredTotal)
  }, [filteredTotal])

  // Если пользователь не загружен, показываем загрузку
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Заголовок */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Добро пожаловать, {user.name || user.email}!
                </h1>
                <p className="text-xl text-gray-600">
                  Ваш личный кабинет для трансформации
                </p>
              </div>
              <Button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Выйти
              </Button>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Всего покупок</p>
                    <p className="text-3xl font-bold text-blue-900">{stats.totalPurchases}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Курсы</p>
                    <p className="text-3xl font-bold text-purple-900">{stats.totalCourses}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Завершено</p>
                    <p className="text-3xl font-bold text-green-900">{stats.completedCourses}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Потрачено</p>
                    <p className="text-3xl font-bold text-orange-900">{stats.totalSpent.toLocaleString()} ₽</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Недавно просмотренные */}
          {recentlyViewed.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Недавно просмотренные</h3>
                <Button size="sm" variant="ghost" onClick={() => { setRecentlyViewed([]); try { localStorage.removeItem('el_recently_viewed') } catch { } }}>Очистить</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentlyViewed.slice(0, 8).map((item) => (
                  <a key={`${item.id}-${item.ts}`} href={item.href} className="text-sm rounded border px-2 py-1 hover:bg-gray-50" onClick={() => track('dashboard_recent_click', { id: item.id, type: item.type })}>
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Основной контент */}
          <Tabs defaultValue="purchases" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="purchases">Мои покупки</TabsTrigger>
              <TabsTrigger value="courses">Курсы</TabsTrigger>
              <TabsTrigger value="achievements">Достижения</TabsTrigger>
              <TabsTrigger value="gifts">Подарки</TabsTrigger>
            </TabsList>

            {/* Мои покупки */}
            <TabsContent value="purchases" className="space-y-6">
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p>{errorMessage}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleRetry}>
                        Повторить попытку
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href="mailto:support@energylogic.ai?subject=Проблема%20с%20доступом">
                          Связаться с поддержкой
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="flex w-full flex-col gap-3 md:flex-row md:items-end md:gap-4">
                      <div className="w-full md:w-72">
                        <label htmlFor="purchase-search" className="mb-1 block text-sm font-medium text-gray-600">
                          Поиск
                        </label>
                        <Input
                          id="purchase-search"
                          placeholder="Название, курс или ID"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                        />
                      </div>
                      <div className="w-full md:w-56">
                        <label htmlFor="purchase-status-filter" className="mb-1 block text-sm font-medium text-gray-600">
                          Статус
                        </label>
                        <select
                          id="purchase-status-filter"
                          className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={statusFilterValue}
                          onChange={(event) => setStatusFilterValue(event.target.value as 'all' | PurchaseStatus)}
                        >
                          {statusFilterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-gray-600 md:items-end">
                      <span>
                        Отобрано {filteredPurchases.length} покупок · {filteredTotalFormatted}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportPurchases}
                        disabled={filteredPurchases.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт CSV
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Название</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Доступ до</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading && purchases.length === 0 && (
                          Array.from({ length: 3 }).map((_, index) => (
                            <TableRow key={`purchase-row-skeleton-${index}`} className="animate-pulse">
                              <TableCell colSpan={7}>
                                <div className="flex flex-col gap-2">
                                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}

                        {!isLoading && filteredPurchases.length > 0 ? (
                          <>
                            {filteredPurchases.map((purchase) => {
                              const effectiveStatus = (purchase.access?.status ?? purchase.status) as PurchaseStatus
                              const statusMeta = getPurchaseStatusMeta(effectiveStatus)
                              const formattedDate = new Date(purchase.created_at).toLocaleDateString('ru-RU')
                              const formattedExpiresAt = purchase.access?.expires_at ? formatDate(purchase.access.expires_at) : null
                              const openHref = purchase.product_type === 'session'
                                ? `/download/${purchase.id}`
                                : purchase.document?.id
                                  ? `/courses/${purchase.document.id}/player`
                                  : undefined

                              return (
                                <TableRow key={`purchase-row-${purchase.id}`}>
                                  <TableCell className="font-medium text-gray-900">
                                    <div className="flex flex-col">
                                      <span>{purchase.product_name}</span>
                                      <span className="text-xs text-gray-500">ID: {purchase.id}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{getProductTypeLabel(purchase.product_type)}</TableCell>
                                  <TableCell>
                                    <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                                  </TableCell>
                                  <TableCell>{formattedDate}</TableCell>
                                  <TableCell>{purchase.price.toLocaleString('ru-RU')} ₽</TableCell>
                                  <TableCell>{formattedExpiresAt || '—'}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {statusMeta.allowActions && openHref ? (
                                        <Button size="sm" variant="outline" asChild>
                                          <a
                                            href={openHref}
                                            target={purchase.product_type === 'session' ? '_blank' : undefined}
                                            rel={purchase.product_type === 'session' ? 'noopener noreferrer' : undefined}
                                            onClick={() => handleOpenClick(purchase)}
                                          >
                                            Открыть
                                          </a>
                                        </Button>
                                      ) : (
                                        <Button size="sm" variant="outline" disabled title={statusMeta.hint}>
                                          Открыть
                                        </Button>
                                      )}
                                      <Button size="sm" variant="ghost" type="button" onClick={() => handleDownloadReceipt(purchase)}>
                                        Чек
                                      </Button>
                                      <Button size="sm" variant="ghost" type="button" onClick={() => handleReportIssue(purchase)}>
                                        Сообщить о проблеме
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </>
                        ) : null}

                        {!isLoading && filteredPurchases.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-6 text-center text-sm text-gray-500">
                              {purchases.length === 0
                                ? 'Здесь появятся ваши покупки после оформления заказа.'
                                : 'По выбранным фильтрам ничего не найдено.'}
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid gap-6">
                  {isLoading && purchases.length === 0 ? (
                    Array.from({ length: 2 }).map((_, index) => (
                      <Card key={`purchase-skeleton-${index}`} className="border border-dashed">
                        <CardHeader>
                          <div className="flex items-center justify-between animate-pulse">
                            <div className="space-y-2">
                              <div className="h-4 w-48 rounded bg-gray-200" />
                              <div className="h-3 w-32 rounded bg-gray-100" />
                            </div>
                            <div className="space-y-2 text-right">
                              <div className="h-5 w-20 rounded bg-gray-200 ml-auto" />
                              <div className="h-5 w-16 rounded bg-gray-100 ml-auto" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="h-2 w-full rounded bg-gray-100 animate-pulse" />
                          <div className="h-8 w-32 rounded bg-gray-200 animate-pulse" />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    filteredPurchases.map((purchase) => {
                      const effectiveStatus = (purchase.access?.status ?? purchase.status) as PurchaseStatus
                      const statusMeta = getPurchaseStatusMeta(effectiveStatus)
                      const HintIcon = statusMeta.tone === 'info' ? Info : AlertCircle
                      const supportMailto = statusMeta.supportReason
                        ? `mailto:support@energylogic.ai?subject=${encodeURIComponent(statusMeta.supportReason)}&body=${encodeURIComponent(
                          `Покупка: ${purchase.product_name} (ID ${purchase.id}). Статус: ${statusMeta.label}.`
                        )}`
                        : undefined
                      const formattedExpiresAt = purchase.access?.expires_at ? formatDate(purchase.access.expires_at) : null

                      return (
                        <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-xl">{purchase.product_name}</CardTitle>
                                <CardDescription>
                                  {getProductTypeLabel(purchase.product_type)} • {new Date(purchase.created_at).toLocaleDateString('ru-RU')}
                                </CardDescription>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">{purchase.price.toLocaleString()} ₽</p>
                                <Badge className={statusMeta.badgeClass} title={statusMeta.hint}>
                                  {statusMeta.label}
                                </Badge>
                                {formattedExpiresAt && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    {effectiveStatus === 'expired' ? 'Истёк' : 'Доступ до'} {formattedExpiresAt}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {purchase.progress && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Прогресс</span>
                                  <span>{purchase.progress}%</span>
                                </div>
                                <Progress value={purchase.progress} className="h-2" />
                              </div>
                            )}
                            <div className="flex gap-2 mt-4 flex-wrap">
                              {statusMeta.allowActions ? (
                                purchase.product_type === 'session' ? (
                                  <>
                                    {purchase.pdf_url && (
                                      <Button size="sm" variant="outline" asChild>
                                        <a href={purchase.pdf_url} target="_blank" rel="noopener noreferrer">
                                          <Download className="h-4 w-4 mr-2" />
                                          Скачать отчёт
                                        </a>
                                      </Button>
                                    )}
                                    {!purchase.pdf_url && (
                                      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700" role="status">
                                        <Clock className="h-4 w-4" />
                                        <span>Ссылка для скачивания появится после обработки отчёта.</span>
                                      </div>
                                    )}
                                    <Button size="sm" variant="outline" asChild>
                                      <a href={`/download/${purchase.id}`} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Просмотр
                                      </a>
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={`/courses/${purchase.document?.id}/player`}>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Открыть курс
                                    </a>
                                  </Button>
                                )
                              ) : (
                                <div
                                  className={`flex w-full flex-col gap-2 rounded-md border px-3 py-2 text-sm ${STATUS_HINT_TONE_STYLES[statusMeta.tone]}`}
                                  role="status"
                                  aria-live="polite"
                                >
                                  <div className="flex items-start gap-3">
                                    <Badge className={`${statusMeta.badgeClass} shrink-0`}>
                                      {statusMeta.label}
                                    </Badge>
                                    <div className="flex items-start gap-2">
                                      <HintIcon className="mt-0.5 h-4 w-4 shrink-0" />
                                      <span>{statusMeta.hint}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {statusMeta.allowRetry && (
                                      <Button size="sm" variant="outline" onClick={() => handleRetryAccess(purchase.id)}>
                                        Повторить попытку
                                      </Button>
                                    )}
                                    {supportMailto && (
                                      <Button size="sm" variant="ghost" asChild>
                                        <a href={supportMailto} onClick={() => handleSupportClick(purchase)}>
                                          Связаться с поддержкой
                                        </a>
                                      </Button>
                                    )}
                                    {!supportMailto && (
                                      <Button size="sm" variant="ghost" onClick={() => handleReportIssue(purchase)}>
                                        Сообщить о проблеме
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>

                {purchases.length === 0 && !errorMessage && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
                    <p className="text-lg font-semibold mb-2">У вас пока нет покупок</p>
                    <p className="mb-4">Начните с выбора подходящего курса или свяжитесь с нами за рекомендациями.</p>
                    <div className="flex justify-center gap-3">
                      <Button asChild>
                        <a href="/catalog">Купить доступ</a>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href="mailto:support@energylogic.ai">Связаться</a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>


            <TabsContent value="courses" className="space-y-6">
              <div className="grid gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
                          <CardDescription className="mb-4">{course.description}</CardDescription>

                          {/* Информация о типе курса */}
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={course.course_type === 'mini_course' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                              {course.course_type === 'mini_course' ? 'Мини-курс' : 'Курс'}
                            </Badge>
                            {course.duration !== 'Не указано' && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="h-4 w-4" />
                                {course.duration}
                              </div>
                            )}
                          </div>

                          {/* Доступные материалы */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              Основной PDF
                            </div>
                            {course.has_workbook && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4 text-orange-500" />
                                {course.workbook_count} тетрадей
                              </div>
                            )}
                            {course.has_videos && (
                              <div className="flex items-center gap-1">
                                <PlayCircle className="h-4 w-4 text-indigo-500" />
                                {course.video_count} видео
                              </div>
                            )}
                            {course.has_audio && (
                              <div className="flex items-center gap-1">
                                <Volume2 className="h-4 w-4 text-red-500" />
                                Аудио
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{course.progress}%</p>
                          <p className="text-sm text-gray-600">Завершено</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Прогресс курса</span>
                          <span>{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" asChild>
                          <a href={`/download/${course.id}`} target="_blank" rel="noopener noreferrer">
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Открыть курс
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/courses/${course.id}`} target="_blank" rel="noopener noreferrer">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Просмотр
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Достижения */}
            <TabsContent value="achievements" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                  <CardContent className="p-6 text-center">
                    <Award className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-yellow-900 mb-2">Первый шаг</h3>
                    <p className="text-sm text-yellow-700">Завершили первую сессию</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-6 text-center">
                    <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-blue-900 mb-2">Целеустремленный</h3>
                    <p className="text-sm text-blue-700">Завершили 3 курса</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-6 text-center">
                    <Star className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-purple-900 mb-2">Эксперт</h3>
                    <p className="text-sm text-purple-700">Завершили все курсы</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Подарки */}
            <TabsContent value="gifts" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-6 text-center">
                    <Gift className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-green-900 mb-2">Бонусный PDF</h3>
                    <p className="text-sm text-green-700 mb-4">Дополнительные материалы по трансформации</p>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Получить
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-pink-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-pink-900 mb-2">Персональная консультация</h3>
                    <p className="text-sm text-pink-700 mb-4">30 минут с экспертом</p>
                    <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                      Записаться
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                  <CardContent className="p-6 text-center">
                    <Trophy className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-indigo-900 mb-2">Эксклюзивный доступ</h3>
                    <p className="text-sm text-indigo-700 mb-4">К закрытому сообществу</p>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      Присоединиться
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <SessionDevices />
        </div>
      </div>
    </MainLayout>
  )
}
