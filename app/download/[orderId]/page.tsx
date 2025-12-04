'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useAuth } from '@/contexts/AuthContext'
import { PageLayout } from '@/components/layout/PageLayout'
import { CourseContent } from '@/components/course/CourseContent'
import type { Document } from '@/types'

interface Order {
  id: string
  user_id: string
  amount: number
  status: string
  pdf_url?: string
  session_date?: string
  session_time?: string
  created_at: string
  updated_at: string
}

export default function DownloadPage() {
  const params = useParams()
  const router = useRouter()
  const { supabase } = useSupabase()
  const { user } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const orderId = params.orderId as string

  useEffect(() => {
    const fetchOrderAndDocument = async () => {
      if (!orderId || !user) return

      try {
        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single()

        if (orderError) {
          setError('Order not found or no access')
          return
        }

        setOrder(orderData)

        // If order has document_id, fetch document info
        if ((orderData as any).document_id) {
          const { data: documentData, error: documentError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', (orderData as any).document_id)
            .single()

          if (!documentError && documentData) {
            setDocument(documentData)
          }
        }
      } catch (err) {
        setError('Failed to load data')
        console.error('Error fetching order:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrderAndDocument()
  }, [orderId, user, supabase])

  const handleDownload = async () => {
    if (!order?.pdf_url) return

    setDownloading(true)
    try {
      // Create a link and trigger download
      const link = window.document.createElement('a')
      link.href = order.pdf_url
      link.download = `energylogic-report-${order.id}.pdf`
      link.target = '_blank'
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)

      // Track download in PostHog
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('pdf_downloaded', {
          order_id: order.id,
          amount: order.amount,
        })
      }
    } catch (err) {
      setError('Error downloading file')
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleViewOnline = () => {
    if (!order?.pdf_url) return
    window.open(order.pdf_url, '_blank')
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Authorization required
        </h1>
        <Button asChild>
          <Link href="/auth/login">Log in</Link>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Order not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            Check the link or contact support
          </p>
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isCompleted = order.status === 'completed'
  const hasPDF = Boolean(order.pdf_url)

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <div className={`text-6xl mb-4 ${hasPDF ? 'text-green-500' : 'text-yellow-500'}`}>
            {hasPDF ? '📄' : '⏳'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {hasPDF ? 'Your report is ready!' : 'Report in progress'}
          </h1>
          <p className="text-xl text-gray-600">
            {hasPDF
              ? 'Your diagnostic results are ready to download'
              : 'We are processing your session results'
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-gray-50 border-b p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Order details
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-sm">{order.id}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCompleted
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {isCompleted ? 'Completed' : 'In progress'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">₽{order.amount.toLocaleString('en-US')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Order date:</span>
                <span>{new Date(order.created_at).toLocaleDateString('en-US')}</span>
              </div>

              {order.session_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Session date:</span>
                  <span>{new Date(order.session_date).toLocaleDateString('en-US')}</span>
                </div>
              )}

              {order.session_time && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Session time:</span>
                  <span>{order.session_time}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasPDF ? (
          <div className="space-y-6">
            {/* Download Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <svg className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    {document?.course_type === 'mini_course' ? 'Mini-course is ready to learn' : 'PDF report is ready to download'}
                  </h3>
                  <p className="text-green-700 mb-4">
                    {document?.course_type === 'mini_course'
                      ? 'Your mini-course includes the main PDF, workbook, video lessons, and audio guidance.'
                      : 'Your personal report contains a detailed analysis, recommendations, and an action plan.'
                    }
                  </p>
                  {document?.course_type === 'mini_course' ? (
                    <div className="text-sm text-green-600 mb-4">
                      <p>Available materials:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Main PDF</li>
                        {document.has_workbook && <li>Workbook</li>}
                        {document.has_videos && <li>{document.video_count || 0} video lessons</li>}
                        {document.has_audio && <li>Audio guidance</li>}
                      </ul>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center space-x-2"
                      >
                        {downloading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Download PDF</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleViewOnline}
                        className="flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        <span>View online</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mini-course content */}
            {document?.course_type === 'mini_course' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <CourseContent document={document} isPurchased={true} />
              </div>
            )}

            {/* What's Inside */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                What’s inside the report
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Energy profile',
                    description: 'Detailed analysis of your current state'
                  },
                  {
                    title: 'Areas of imbalance',
                    description: 'Identified problem areas and root causes'
                  },
                  {
                    title: 'Personal recommendations',
                    description: 'Individual improvement and growth plan'
                  },
                  {
                    title: 'Practical exercises',
                    description: 'Specific techniques to improve your state'
                  },
                  {
                    title: 'Development forecast',
                    description: 'Expected results when following the plan'
                  },
                  {
                    title: 'Additional resources',
                    description: 'Helpful materials and links to explore'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <svg className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Отчет готовится
                </h3>
                <p className="text-yellow-700 mb-4">
                  Наши специалисты анализируют результаты вашей сессии.
                  Обычно это занимает 2-3 рабочих дня. Мы уведомим вас по email,
                  когда отчет будет готов.
                </p>
                <div className="text-sm text-yellow-600">
                  <strong>Ожидаемое время готовности:</strong>
                  {order.updated_at && ` ${new Date(new Date(order.updated_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Личный кабинет</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/book">Записаться еще раз</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Главная страница</Link>
          </Button>
        </div>

        {/* Support */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Вопросы по отчету? Обратитесь в поддержку:
            <a href="mailto:support@energylogic.com" className="text-blue-600 hover:underline ml-1">
              support@energylogic.com
            </a>
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
