'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useAuth } from '@/contexts/AuthContext'
import { DailyIframe } from '@/lib/daily'
import { PageLayout } from '@/components/layout/PageLayout'

interface Session {
  id: string
  order_id: string
  daily_room_name: string
  daily_room_url: string
  status: string
  scheduled_at: string
  started_at?: string
  ended_at?: string
}

interface Order {
  id: string
  user_id: string
  amount: number
  status: string
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const { supabase } = useSupabase()
  const { user } = useAuth()

  const [session, setSession] = useState<Session | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [callFrame, setCallFrame] = useState<any>(null)
  const [isCallStarted, setIsCallStarted] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])

  const callFrameRef = useRef<HTMLDivElement>(null)

  const sessionId = params.id as string

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId || !user) return

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select(`
            *,
            orders!inner(*)
          `)
          .eq('id', sessionId)
          .eq('orders.user_id', user.id)
          .single()

        if (sessionError) {
          setError('Сессия не найдена или у вас нет доступа')
          return
        }

        setSession(sessionData)
        setOrder(sessionData.orders)
      } catch (err) {
        setError('Ошибка загрузки данных')
        console.error('Error fetching session:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId, user, supabase])

  // Initialize Daily call frame
  const initializeCallFrame = useCallback(async () => {
    if (!session || !callFrameRef.current) return

    try {
      const callFrame = DailyIframe.createFrame(callFrameRef.current, {
        iframeStyle: {
          width: '100%',
          height: '500px',
          border: 'none',
          borderRadius: '8px',
        },
        showLeaveButton: true,
        showFullscreenButton: true,
        showLocalVideo: true,
        showParticipantsBar: true,
      })

      // Event listeners
      callFrame
        .on('joined-meeting', () => {
          setIsCallStarted(true)
          console.log('Joined meeting')
        })
        .on('left-meeting', () => {
          setIsCallStarted(false)
          console.log('Left meeting')
        })
        .on('participant-joined', (event: any) => {
          console.log('Participant joined:', event.participant)
          setParticipants(prev => [...prev, event.participant])
        })
        .on('participant-left', (event: any) => {
          console.log('Participant left:', event.participant)
          setParticipants(prev =>
            prev.filter(p => p.session_id !== event.participant.session_id)
          )
        })
        .on('error', (event: any) => {
          console.error('Daily error:', event)
          setError('Ошибка подключения к видеозвонку')
        })

      setCallFrame(callFrame)
    } catch (err) {
      console.error('Error initializing call frame:', err)
      setError('Не удалось инициализировать видеозвонок')
    }
  }, [session])

  // Join call
  const joinCall = async () => {
    if (!callFrame || !session) return

    try {
      // Get meeting token from API
      const response = await fetch('/api/daily/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: session.daily_room_name,
          userName: user?.email || 'Участник',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get meeting token')
      }

      const { token } = await response.json()

      // Join the call
      await callFrame.join({
        url: session.daily_room_url,
        token,
      })

      // Update session status
      await supabase
        .from('sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionId)

    } catch (err) {
      console.error('Error joining call:', err)
      setError('Не удалось подключиться к сессии')
    }
  }

  // Leave call
  const leaveCall = async () => {
    if (!callFrame) return

    try {
      await callFrame.leave()

      // Update session status
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      router.push('/dashboard')
    } catch (err) {
      console.error('Error leaving call:', err)
    }
  }

  useEffect(() => {
    if (session) {
      initializeCallFrame()
    }

    return () => {
      if (callFrame) {
        callFrame.destroy()
      }
    }
  }, [session, initializeCallFrame])

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Необходима авторизация
        </h1>
        <Button asChild>
          <a href="/auth/login">Войти</a>
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

  if (error || !session || !order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Сессия не найдена'}
          </h1>
          <p className="text-gray-600 mb-6">
            Проверьте ссылку или обратитесь в поддержку
          </p>
          <Button asChild>
            <a href="/dashboard">Личный кабинет</a>
          </Button>
        </div>
      </div>
    )
  }

  const sessionDate = new Date(session.scheduled_at)
  const now = new Date()
  const canJoin = Math.abs(now.getTime() - sessionDate.getTime()) <= 30 * 60 * 1000 // 30 minutes

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Энергетическая диагностика
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  {sessionDate.toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {sessionDate.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${session.status === 'active' ? 'bg-green-500' :
                      session.status === 'completed' ? 'bg-gray-500' :
                        'bg-yellow-500'
                    }`}></div>
                  {session.status === 'active' ? 'Активна' :
                    session.status === 'completed' ? 'Завершена' :
                      'Запланирована'}
                </div>
              </div>
            </div>

            <div className="mt-4 lg:mt-0 flex space-x-3">
              {!isCallStarted && canJoin && session.status !== 'completed' && (
                <Button onClick={joinCall} size="lg">
                  Подключиться к сессии
                </Button>
              )}
              {isCallStarted && (
                <Button onClick={leaveCall} variant="destructive" size="lg">
                  Завершить сессию
                </Button>
              )}
              {!canJoin && session.status === 'scheduled' && (
                <div className="text-sm text-gray-600">
                  Подключение будет доступно за 30 минут до начала
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Video Call Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Видеосвязь
                </h2>
              </div>

              <div className="p-6">
                <div
                  ref={callFrameRef}
                  className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
                  style={{ minHeight: '500px' }}
                >
                  {!session.daily_room_url && (
                    <div className="text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      <p>Инициализация видеосвязи...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="mt-6 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Информация о сессии
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Продолжительность:</strong> 60 минут
                </div>
                <div>
                  <strong>Тип:</strong> Энергетическая диагностика
                </div>
                <div>
                  <strong>Статус заказа:</strong> {order.status}
                </div>
                <div>
                  <strong>Сумма:</strong> ₽{order.amount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Participants */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Участники
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Вы</div>
                    <div className="text-xs text-gray-500">Клиент</div>
                  </div>
                  {isCallStarted && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>

                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {participant.user_name?.[0]?.toUpperCase() || 'С'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {participant.user_name || 'Специалист'}
                      </div>
                      <div className="text-xs text-gray-500">Консультант</div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Технические требования
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Микрофон (обязательно)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Стабильное интернет-соединение</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Камера (рекомендуется)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Тихое помещение</span>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Нужна помощь?
              </h3>
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="mailto:support@energylogic.com">
                    Написать в поддержку
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="tel:+7-999-123-45-67">
                    Позвонить
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
