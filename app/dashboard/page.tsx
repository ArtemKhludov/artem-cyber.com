'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import ErrorBoundary from '@/components/common/ErrorBoundary'
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
  FileText,
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
  Volume2,
  MessageSquare
} from 'lucide-react'
import { SessionDevices } from '@/components/dashboard/SessionDevices'
import { initPostHog } from '@/lib/posthog'
import {
  appendRecentActivity,
  clearRecentActivityStorage,
  loadRecentActivity,
  markActivitiesDismissed,
  mergeWithLocalActivity,
  type RecentActivityRecord
} from '@/lib/recent-activity'
import ReportIssueDialog, { type IssueContext } from '@/components/dashboard/ReportIssueDialog'
import { TelegramLink } from '@/components/dashboard/TelegramLink'
import { UserIssuesList } from '@/components/dashboard/UserIssuesList'
import { UserCallbacksWithReplies } from '@/components/dashboard/UserCallbacksWithReplies'
import { CallbacksSection } from '@/components/dashboard/CallbacksSection'
import { PhonePromptModal } from '@/components/auth/PhonePromptModal'
import { EmptyCoursesAnimation } from '@/components/dashboard/EmptyCoursesAnimation'
import { TelegramConnectPrompt } from '@/components/dashboard/TelegramConnectPrompt'

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
    label: 'Completed',
    badgeClass: 'bg-green-100 text-green-800',
    allowActions: true,
    hint: 'Access to materials is open.',
    tone: 'info'
  },
  active: {
    label: 'Active',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    allowActions: true,
    hint: 'You have active access to materials.',
    tone: 'info'
  },
  in_progress: {
    label: 'Processing',
    badgeClass: 'bg-blue-100 text-blue-800',
    allowActions: false,
    hint: 'Payment is being processed. Refresh the page in a few minutes - access will appear automatically.',
    tone: 'info',
    allowRetry: true,
    supportReason: 'Payment stuck in "Processing" status'
  },
  pending: {
    label: 'Payment Pending',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    allowActions: false,
    hint: 'Payment has not been completed. Complete the payment to unlock materials.',
    tone: 'warning',
    allowRetry: true,
    supportReason: 'Payment shows as "Pending" but access did not open'
  },
  expired: {
    label: 'Access Expired',
    badgeClass: 'bg-orange-100 text-orange-800',
    allowActions: false,
    hint: 'Access period has ended. Renew your access or contact support if you need additional access.',
    tone: 'warning',
    allowRetry: true,
    supportReason: 'Request to extend or restore access to materials'
  },
  revoked: {
    label: 'Access Revoked',
    badgeClass: 'bg-red-100 text-red-800',
    allowActions: false,
    hint: 'Access has been revoked. Contact support if this is unexpected.',
    tone: 'danger',
    supportReason: 'Access to materials was revoked'
  },
  failed: {
    label: 'Payment Failed',
    badgeClass: 'bg-rose-100 text-rose-800',
    allowActions: false,
    hint: 'Payment failed. Check your card details and try again. If the problem persists, contact support.',
    tone: 'danger',
    allowRetry: true,
    supportReason: 'Payment not going through, need help'
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
  const [, setStats] = useState({
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
  const [recentActivity, setRecentActivity] = useState<RecentActivityRecord[]>(() => loadRecentActivity())
  const [recentActivityLoading, setRecentActivityLoading] = useState(false)
  const [recentActivityError, setRecentActivityError] = useState<string | null>(null)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueContext, setIssueContext] = useState<IssueContext | null>(null)
  const [menuOffset, setMenuOffset] = useState(96)
  const [showPhonePrompt, setShowPhonePrompt] = useState(false)
  const [userPhone, setUserPhone] = useState<string | null>(null)
  const [showTelegramPrompt, setShowTelegramPrompt] = useState(false)

  const track = useCallback((event: string, props?: Record<string, unknown>) => {
    const ph = initPostHog()
    ph?.capture(event, props)
  }, [])

  const pushLocalActivity = useCallback((entry: {
    materialKey: string
    materialId?: string | null
    materialType: string
    materialTitle: string
    action: 'view' | 'download'
    courseId?: string | null
    courseTitle?: string | null
    url?: string
  }) => {
    const occurredAt = new Date().toISOString()
    const record: RecentActivityRecord = {
      id: `${entry.materialKey}-${entry.action}-${Date.now()}`,
      courseId: entry.courseId || '',
      courseTitle: entry.courseTitle || null,
      materialKey: entry.materialKey,
      materialId: entry.materialId ?? null,
      materialType: entry.materialType,
      materialTitle: entry.materialTitle,
      action: entry.action,
      url: entry.url || '/dashboard',
      occurredAt,
      source: 'local'
    }

    appendRecentActivity(record)
    setRecentActivity((prev) => mergeWithLocalActivity([record, ...prev]))
  }, [])

  const fetchRecentActivity = useCallback(async () => {
    if (!user) {
      setRecentActivity(loadRecentActivity())
      return
    }

    setRecentActivityLoading(true)
    setRecentActivityError(null)

    try {
      const response = await fetch('/api/user/activity?limit=25', {
        credentials: 'include'
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to load history')
      }

      const json = await response.json()
      const serverRecords: RecentActivityRecord[] = Array.isArray(json.activity)
        ? json.activity.map((item: any) => {
          const metadata = item?.metadata || {}
          const courseId = typeof metadata.courseId === 'string' && metadata.courseId
            ? metadata.courseId
            : ''
          const materialKey = typeof metadata.materialKey === 'string' && metadata.materialKey
            ? metadata.materialKey
            : `${item.action}-${item.targetId ?? courseId}`
          const materialType = typeof metadata.materialType === 'string' && metadata.materialType
            ? metadata.materialType
            : 'resource'
          const materialTitle = typeof metadata.materialTitle === 'string' && metadata.materialTitle
            ? metadata.materialTitle
            : 'Material'
          const materialIdValue = metadata.materialId ?? item.targetId ?? null
          const action: 'view' | 'download' = item.action?.includes('download') ? 'download' : 'view'

          return {
            id: item.id,
            courseId: courseId || '',
            courseTitle: typeof metadata.courseTitle === 'string' ? metadata.courseTitle : null,
            materialKey,
            materialId: materialIdValue ? String(materialIdValue) : null,
            materialType,
            materialTitle,
            action,
            url: courseId ? `/courses/${courseId}/player` : '/dashboard',
            occurredAt: item.occurredAt ?? item.created_at ?? new Date().toISOString(),
            source: 'server'
          } satisfies RecentActivityRecord
        })
        : []

      setRecentActivity(mergeWithLocalActivity(serverRecords))
      track('dashboard_recent_refresh_success', { count: serverRecords.length })
    } catch (error) {
      console.warn('Recently viewed: loading error', error)
      setRecentActivityError('Failed to update activity history')
      setRecentActivity(loadRecentActivity())
      track('dashboard_recent_refresh_failed')
    } finally {
      setRecentActivityLoading(false)
    }
  }, [track, user])

  useEffect(() => {
    if (!user) return
    void fetchRecentActivity()
  }, [user, fetchRecentActivity, retryCount])

  useEffect(() => {
    if (user) {
      loadUserData()
      // Check if user has a phone number
      checkPhoneNumber()
    }
  }, [user])

  const checkPhoneNumber = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      if (response.ok) {
        const userData = await response.json()
        setUserPhone(userData.phone || null)
        // Show modal only if phone is missing and this is first login
        if (!userData.phone && !localStorage.getItem('phone_prompt_dismissed')) {
          setShowPhonePrompt(true)
        }

        // Show Telegram prompt if user hasn't connected Telegram
        if (!userData.telegram_username && !localStorage.getItem('telegram_prompt_dismissed')) {
          // Show with delay after page load
          setTimeout(() => {
            setShowTelegramPrompt(true)
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Failed to check phone:', error)
    }
  }

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

        // Transform courses from purchases
        const courseData = data.courses.map((purchase: any) => ({
          id: purchase.id,
          title: purchase.document?.title || purchase.product_name,
          description: purchase.document?.description || 'Purchased course',
          progress: purchase.progress || 0,
          total_lessons: purchase.document?.course_type === 'mini_course' ?
            (purchase.document?.workbook_count || 0) + (purchase.document?.video_count || 0) + 1 : 1,
          completed_lessons: Math.floor((purchase.progress || 0) / 100 *
            (purchase.document?.course_type === 'mini_course' ?
              (purchase.document?.workbook_count || 0) + (purchase.document?.video_count || 0) + 1 : 1)),
          thumbnail: purchase.document?.cover_url || '/api/placeholder/300/200',
          duration: purchase.document?.course_duration_minutes ?
            `${Math.floor(purchase.document.course_duration_minutes / 60)}h ${purchase.document.course_duration_minutes % 60}m` : 'Not specified',
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
        setErrorMessage('Failed to load purchases. Please try again later.')
        // If API is unavailable, use mock data
        setPurchases([
          {
            id: '1',
            product_name: 'Mini Session',
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
            product_name: 'Deep Day',
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
            product_name: 'Advanced Subconscious Techniques',
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
              title: 'Advanced Subconscious Techniques',
              description: 'Deep methods for working through internal blocks',
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
            title: 'Personal Transformation Fundamentals',
            description: 'Learn the basic principles of changing thinking and behavior',
            progress: 75,
            total_lessons: 12,
            completed_lessons: 9,
            thumbnail: '/api/placeholder/300/200',
            duration: '2 hours',
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
            title: 'Advanced Subconscious Techniques',
            description: 'Deep methods for working through internal blocks',
            progress: 30,
            total_lessons: 8,
            completed_lessons: 2,
            thumbnail: '/api/placeholder/300/200',
            duration: '3 hours',
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
            title: 'Advanced Subconscious Techniques',
            description: 'Access active until end of year',
            progress: 80,
            total_lessons: 10,
            completed_lessons: 8,
            thumbnail: '/api/placeholder/300/200',
            duration: '1 hour 30 minutes',
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
      console.error('Error loading data:', error)
      setErrorMessage('An error occurred while loading data. Check your connection and try again.')
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
    console.info('Retry access request for purchase', purchaseId)
    setRetryCount((prev) => prev + 1)
    void loadUserData()
    track('dashboard_access_retry_click', { purchaseId })
  }

  const handleRefreshRecentActivity = () => {
    track('dashboard_recent_refresh')
    void fetchRecentActivity()
  }

  const handleClearRecentActivity = () => {
    track('dashboard_recent_clear')
    markActivitiesDismissed(recentActivity.map((item) => item.id))
    clearRecentActivityStorage()
    setRecentActivity([])
  }

  const handleOpenRecentItem = (item: RecentActivityRecord) => {
    track('dashboard_recent_open', {
      materialKey: item.materialKey,
      action: item.action,
      materialType: item.materialType
    })

    if (typeof window !== 'undefined') {
      window.location.href = item.url
    }
  }

  const handleExportPurchases = () => {
    if (typeof window === 'undefined') return
    if (filteredPurchases.length === 0) {
      console.info('No purchases to export')
      return
    }

    const header = ['ID', 'Name', 'Type', 'Status', 'Date', 'Amount']
    const rows = filteredPurchases.map((purchase) => {
      const effectiveStatus = (purchase.access?.status ?? purchase.status) as PurchaseStatus
      const statusLabel = getPurchaseStatusMeta(effectiveStatus).label
      const purchaseDate = new Date(purchase.created_at).toLocaleDateString('en-US')

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
    track('dashboard_receipt_click', { purchaseId: purchase.id, hasUrl: Boolean(receiptUrl) })
    if (receiptUrl) {
      window.open(receiptUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const subject = `Receipt request for purchase ${purchase.product_name}`
    const bodyLines = [
      `Hello! Please send a receipt for purchase ${purchase.product_name} (ID ${purchase.id}) from ${new Date(purchase.created_at).toLocaleDateString('en-US')}.`,
      '',
      `Identification data: status ${getPurchaseStatusMeta((purchase.access?.status ?? purchase.status) as PurchaseStatus).label}.`
    ]
    const body = bodyLines.join('\n')

    window.location.href = `mailto:support@energylogic.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'mini_course': return 'Mini Course'
      case 'pdf': return 'Course'
      case 'session': return 'Energy Diagnostics'
      default: return type
    }
  }

  const handleOpenClick = (purchase: Purchase) => {
    track('dashboard_open_click', { id: purchase.id, type: purchase.product_type })
    const url = purchase.product_type === 'session'
      ? `/download/${purchase.id}`
      : purchase.document?.id
        ? `/courses/${purchase.document.id}/player`
        : '/dashboard'

    pushLocalActivity({
      materialKey: purchase.document?.id ? `course_${purchase.document.id}` : `purchase_${purchase.id}`,
      materialId: purchase.document?.id ?? purchase.id,
      materialType: purchase.product_type,
      materialTitle: purchase.product_name,
      courseId: purchase.document?.id ?? null,
      courseTitle: purchase.document?.title ?? purchase.product_name,
      action: 'view',
      url
    })
  }

  const handleSupportClick = (purchase?: Purchase) => {
    track('dashboard_support_click', purchase ? { purchaseId: purchase.id } : undefined)
  }

  const handlePhoneSubmit = async (phone: string) => {
    try {
      const response = await fetch('/api/user/update-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
        credentials: 'include'
      })

      if (response.ok) {
        setUserPhone(phone)
        setShowPhonePrompt(false)
        localStorage.setItem('phone_prompt_dismissed', 'true')
        track('phone_added', { source: 'first_login_prompt' })
      } else {
        console.error('Failed to update phone')
      }
    } catch (error) {
      console.error('Error updating phone:', error)
    }
  }

  const handlePhoneSkip = () => {
    setShowPhonePrompt(false)
    localStorage.setItem('phone_prompt_dismissed', 'true')
    track('phone_prompt_skipped')
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const headerElement = document.querySelector<HTMLElement>('header')
    if (!headerElement) return

    const measureOffset = () => {
      const headerHeight = headerElement.getBoundingClientRect().height
      const extraSpacing = 192
      setMenuOffset(Math.max(headerHeight + 16 + extraSpacing, 200))
    }

    measureOffset()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measureOffset)
      : null

    if (resizeObserver) {
      resizeObserver.observe(headerElement)
    }

    window.addEventListener('resize', measureOffset)

    return () => {
      window.removeEventListener('resize', measureOffset)
      resizeObserver?.disconnect()
    }
  }, [])

  const handleOpenIssuesTab = () => {
    track('dashboard_issues_open')
    setIssueContext(null)
    setIssueDialogOpen(true)
  }

  const handleReportIssue = (purchase: Purchase) => {
    const effectiveStatus = (purchase.access?.status ?? purchase.status) as PurchaseStatus
    const statusMeta = getPurchaseStatusMeta(effectiveStatus)
    track('dashboard_report_issue_click', { id: purchase.id, status: effectiveStatus })
    setIssueContext({
      subject: `Issue with purchase: ${purchase.product_name}`,
      purchaseId: purchase.id,
      purchaseName: purchase.product_name,
      purchaseStatus: effectiveStatus,
      purchaseStatusLabel: statusMeta.label,
      purchaseDate: new Date(purchase.created_at).toLocaleDateString('en-US'),
      productType: getProductTypeLabel(purchase.product_type),
      courseId: purchase.document?.id,
      courseTitle: purchase.document?.title,
      url: purchase.product_type === 'session'
        ? `/download/${purchase.id}`
        : purchase.document?.id
          ? `/courses/${purchase.document.id}/player`
          : '/dashboard'
    })
    setIssueDialogOpen(true)
  }

  const UNKNOWN_STATUS_META = {
    label: 'Unknown Status',
    badgeClass: 'bg-gray-100 text-gray-800',
    allowActions: false,
    hint: 'Order status not recognized. Refresh the page or contact support.',
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
      return new Date(isoString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    } catch (error) {
      console.warn('Failed to format access expiration date', isoString, error)
      return null
    }
  }

  const formatDateTime = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(isoString))
    } catch (error) {
      console.warn('Failed to format activity time', isoString, error)
      return isoString
    }
  }

  const getActivityIcon = (materialType: string, action: 'view' | 'download') => {
    if (action === 'download') {
      return <Download className="h-4 w-4 text-blue-500" />
    }

    switch (materialType) {
      case 'video':
        return <PlayCircle className="h-4 w-4 text-purple-500" />
      case 'audio':
        return <Volume2 className="h-4 w-4 text-orange-500" />
      case 'workbook':
      case 'main_pdf':
      case 'pdf':
        return <FileText className="h-4 w-4 text-green-600" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityLabel = (action: 'view' | 'download') => {
    return action === 'download' ? 'Download' : 'View'
  }

  const getActivityBadgeClass = (action: 'view' | 'download') => {
    return action === 'download'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-emerald-100 text-emerald-800'
  }

  const statusFilterOptions = useMemo(() => {
    return [
      { value: 'all' as const, label: 'All Statuses' },
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(filteredTotal)
  }, [filteredTotal])

  // If user is not loaded, show loading
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
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            {/* Main content */}
            <Tabs
              defaultValue="courses"
              className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:items-start"
            >
              <TabsList
                className="flex gap-2 overflow-x-auto bg-transparent p-0 md:sticky md:self-start md:flex-col md:items-stretch md:gap-3 md:overflow-visible"
                style={{ top: menuOffset, marginTop: menuOffset }}
              >
                <TabsTrigger
                  value="courses"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <BookOpen className="h-4 w-4" /> Courses
                </TabsTrigger>
                <TabsTrigger
                  value="purchases"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <FileText className="h-4 w-4" /> My Purchases
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <Clock className="h-4 w-4" /> Recent
                </TabsTrigger>
                <TabsTrigger
                  value="sessions"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <CheckCircle className="h-4 w-4" /> Sessions
                </TabsTrigger>
                <TabsTrigger
                  value="callbacks"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Inquiries
                </TabsTrigger>
                <TabsTrigger
                  value="achievements"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <Award className="h-4 w-4" /> Achievements
                </TabsTrigger>
                <TabsTrigger
                  value="gifts"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <Gift className="h-4 w-4" /> Gifts
                </TabsTrigger>
                <TabsTrigger
                  value="issues"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <AlertCircle className="h-4 w-4" /> Support
                </TabsTrigger>
                <TabsTrigger
                  value="callbacks"
                  className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Requests
                </TabsTrigger>
                <Button
                  type="button"
                  onClick={logout}
                  variant="destructive"
                  className="w-full"
                >
                  Logout
                </Button>
              </TabsList>

              {/* My purchases */}
              <TabsContent value="purchases" className="space-y-6">
                {errorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p>{errorMessage}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleRetry}>
                          Retry
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a href="mailto:support@energylogic.ai?subject=Access%20Issue">
                            Contact Support
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
                            Search
                          </label>
                          <Input
                            id="purchase-search"
                            placeholder="Name, course, or ID"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                          />
                        </div>
                        <div className="w-full md:w-56">
                          <label htmlFor="purchase-status-filter" className="mb-1 block text-sm font-medium text-gray-600">
                            Status
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
                          Showing {filteredPurchases.length} purchases · {filteredTotalFormatted}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleExportPurchases}
                          disabled={filteredPurchases.length === 0}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export CSV
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Access Until</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                const formattedDate = new Date(purchase.created_at).toLocaleDateString('en-US')
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
                                    <TableCell>${purchase.price.toLocaleString('en-US')}</TableCell>
                                    <TableCell>{formattedExpiresAt || '-'}</TableCell>
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
                                              Open
                                            </a>
                                          </Button>
                                        ) : (
                                          <Button size="sm" variant="outline" disabled title={statusMeta.hint}>
                                            Open
                                          </Button>
                                        )}
                                        <Button size="sm" variant="ghost" type="button" onClick={() => handleDownloadReceipt(purchase)}>
                                          Receipt
                                        </Button>
                                        <Button size="sm" variant="ghost" type="button" onClick={() => handleReportIssue(purchase)}>
                                          Report Issue
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
                                  ? 'Your purchases will appear here after placing an order.'
                                  : 'No results found for the selected filters.'}
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
                            `Purchase: ${purchase.product_name} (ID ${purchase.id}). Status: ${statusMeta.label}.`
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
                                    {getProductTypeLabel(purchase.product_type)} • {new Date(purchase.created_at).toLocaleDateString('en-US')}
                                  </CardDescription>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-gray-900">${purchase.price.toLocaleString()}</p>
                                  <Badge className={statusMeta.badgeClass} title={statusMeta.hint}>
                                    {statusMeta.label}
                                  </Badge>
                                  {formattedExpiresAt && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {effectiveStatus === 'expired' ? 'Expired' : 'Access until'} {formattedExpiresAt}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {purchase.progress && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Progress</span>
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
                                            Download Report
                                          </a>
                                        </Button>
                                      )}
                                      {!purchase.pdf_url && (
                                        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700" role="status">
                                          <Clock className="h-4 w-4" />
                                          <span>Download link will appear after report processing.</span>
                                        </div>
                                      )}
                                      <Button size="sm" variant="outline" asChild>
                                        <a href={`/download/${purchase.id}`} target="_blank" rel="noopener noreferrer">
                                          <PlayCircle className="h-4 w-4 mr-2" />
                                          View
                                        </a>
                                      </Button>
                                    </>
                                  ) : (
                                    <Button size="sm" variant="outline" asChild>
                                      <a href={`/courses/${purchase.document?.id}/player`}>
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Open Course
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
                                          Retry
                                        </Button>
                                      )}
                                      {supportMailto && (
                                        <Button size="sm" variant="ghost" asChild>
                                          <a href={supportMailto} onClick={() => handleSupportClick(purchase)}>
                                            Contact Support
                                          </a>
                                        </Button>
                                      )}
                                      {!supportMailto && (
                                        <Button size="sm" variant="ghost" onClick={() => handleReportIssue(purchase)}>
                                          Report Issue
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <Button size="sm" variant="ghost" type="button" onClick={() => handleReportIssue(purchase)}>
                                  Report Issue
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>

                  {purchases.length === 0 && !errorMessage && (
                    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
                      <p className="text-lg font-semibold mb-2">You don&apos;t have any purchases yet</p>
                      <p className="mb-4">Start by choosing a suitable course or contact us for recommendations.</p>
                      <div className="flex justify-center gap-3">
                        <Button asChild>
                          <a href="/catalog">Buy Access</a>
                        </Button>
                        <Button variant="outline" asChild>
                          <a href="mailto:support@energylogic.ai">Contact</a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>


              <TabsContent value="recent" className="space-y-6">
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-lg text-gray-900">Recently Viewed</CardTitle>
                      <CardDescription>
                        Recent views and downloads of materials
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefreshRecentActivity}
                        disabled={recentActivityLoading}
                      >
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearRecentActivity}
                        disabled={recentActivity.length === 0}
                      >
                        Clear
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentActivityLoading && (
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={`recent-skeleton-${index}`}
                            className="h-16 w-full animate-pulse rounded-md bg-gray-100"
                          />
                        ))}
                      </div>
                    )}

                    {!recentActivityLoading && recentActivityError && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        {recentActivityError}
                      </div>
                    )}

                    {!recentActivityLoading && !recentActivityError && recentActivity.length === 0 && (
                      <p className="text-sm text-gray-500">
                        Materials you&apos;ve viewed or downloaded will appear here.
                      </p>
                    )}

                    {!recentActivityLoading && !recentActivityError && recentActivity.length > 0 && (
                      <div className="space-y-3">
                        {recentActivity.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                                {getActivityIcon(item.materialType, item.action)}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">{item.materialTitle}</p>
                                <p className="text-xs text-gray-500">
                                  {getActivityLabel(item.action)} • {formatDateTime(item.occurredAt)}
                                </p>
                                {item.courseTitle && (
                                  <p className="text-xs text-gray-500">Course: {item.courseTitle}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <Badge className={getActivityBadgeClass(item.action)}>
                                {getActivityLabel(item.action)}
                              </Badge>
                              <Button size="sm" variant="ghost" onClick={() => handleOpenRecentItem(item)}>
                                Open
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-6">
                <SessionDevices />
              </TabsContent>

              <TabsContent value="callbacks" className="space-y-6">
                <CallbacksSection />
              </TabsContent>


              <TabsContent value="courses" className="space-y-6">
                {courses.length > 0 ? (
                  <div className="grid gap-6">
                    {courses.map((course) => (
                      <Card key={course.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
                              <CardDescription className="mb-4">{course.description}</CardDescription>

                              {/* Course type information */}
                              <div className="flex items-center gap-2 mb-3">
                                <Badge className={course.course_type === 'mini_course' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                                  {course.course_type === 'mini_course' ? 'Mini Course' : 'Course'}
                                </Badge>
                                {course.duration !== 'Not specified' && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Clock className="h-4 w-4" />
                                    {course.duration}
                                  </div>
                                )}
                              </div>

                              {/* Available materials */}
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  Main PDF
                                </div>
                                {course.has_workbook && (
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="h-4 w-4 text-orange-500" />
                                    {course.workbook_count} workbooks
                                  </div>
                                )}
                                {course.has_videos && (
                                  <div className="flex items-center gap-1">
                                    <PlayCircle className="h-4 w-4 text-indigo-500" />
                                    {course.video_count} videos
                                  </div>
                                )}
                                {course.has_audio && (
                                  <div className="flex items-center gap-1">
                                    <Volume2 className="h-4 w-4 text-red-500" />
                                    Audio
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{course.progress}%</p>
                              <p className="text-sm text-gray-600">Completed</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span>Course Progress</span>
                              <span>{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" asChild>
                              <a href={`/download/${course.id}`} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Open Course
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/courses/${course.id}`} target="_blank" rel="noopener noreferrer">
                                <BookOpen className="h-4 w-4 mr-2" />
                                View
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyCoursesAnimation />
                )}
              </TabsContent>

              {/* Achievements */}
              <TabsContent value="achievements" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardContent className="p-6 text-center">
                      <Award className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-yellow-900 mb-2">First Step</h3>
                      <p className="text-sm text-yellow-700">Completed first session</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-blue-900 mb-2">Determined</h3>
                      <p className="text-sm text-blue-700">Completed 3 courses</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-6 text-center">
                      <Star className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-purple-900 mb-2">Expert</h3>
                      <p className="text-sm text-purple-700">Completed all courses</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Gifts */}
              <TabsContent value="gifts" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-6 text-center">
                      <Gift className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-green-900 mb-2">Bonus PDF</h3>
                      <p className="text-sm text-green-700 mb-4">Additional transformation materials</p>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Get
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                    <CardContent className="p-6 text-center">
                      <Calendar className="h-12 w-12 text-pink-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-pink-900 mb-2">Personal Consultation</h3>
                      <p className="text-sm text-pink-700 mb-4">30 minutes with an expert</p>
                      <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                        Book
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                    <CardContent className="p-6 text-center">
                      <Trophy className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-indigo-900 mb-2">Exclusive Access</h3>
                      <p className="text-sm text-indigo-700 mb-4">To a closed community</p>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        Join
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="issues" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <TelegramLink />
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle>Support</CardTitle>
                      <CardDescription>
                        Contact us if you&apos;ve encountered a problem or have a question.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-600">
                        The button will open a feedback form right here in your dashboard.
                      </p>
                      <Button size="sm" onClick={handleOpenIssuesTab}>
                        Report Issue
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <UserIssuesList />
              </TabsContent>

              <TabsContent value="callbacks" className="space-y-6">
                <UserCallbacksWithReplies userId={user.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ErrorBoundary>
      <ReportIssueDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        context={issueContext}
        track={track}
        onSubmitted={() => {
          setTimeout(() => setIssueDialogOpen(false), 1200)
        }}
      />
      <PhonePromptModal
        isOpen={showPhonePrompt}
        onSubmit={handlePhoneSubmit}
        onSkip={handlePhoneSkip}
      />
      <TelegramConnectPrompt
        isOpen={showTelegramPrompt}
        onClose={() => setShowTelegramPrompt(false)}
        onConnect={() => {
          // Telegram connection logic
          setShowTelegramPrompt(false)
        }}
      />
    </MainLayout>
  )
}
