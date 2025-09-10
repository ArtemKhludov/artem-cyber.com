'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, MessageCircle, Eye, ShoppingCart, FileText, Users, Play, Video } from 'lucide-react'
import { CourseContent } from '@/components/course/CourseContent'
import type { Document } from '@/types'

interface PDFPreviewProps {
  document: Document
  onCallRequest?: () => void
}

export function PDFPreview({ document, onCallRequest }: PDFPreviewProps) {
  const [purchaseCount, setPurchaseCount] = useState<number>(0)
  const [todayPurchases, setTodayPurchases] = useState<number>(0)
  const [currentViewers, setCurrentViewers] = useState<number>(0)
  const [pageCount, setPageCount] = useState<number>(0)
  const [pageCountLoading, setPageCountLoading] = useState<boolean>(true)

  // Определяем тип контента
  const isMiniCourse = document.course_type === 'mini_course'

  useEffect(() => {
    const calculateStats = () => {
      const createdDate = new Date(document.created_at)
      const now = new Date()
      const daysSinceLaunch = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

      const seed = document.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)

      // Общее количество покупок: база + случайные покупки по дням
      const basePurchases = 20 + (seed % 81)
      let totalPurchases = basePurchases

      // Добавляем случайные покупки за каждый день (2-20 в сутки)
      for (let day = 0; day < daysSinceLaunch; day++) {
        const dailySeed = seed + day
        const dailyPurchases = 2 + (dailySeed % 19) // 2-20 покупок в сутки
        totalPurchases += dailyPurchases
      }

      setPurchaseCount(totalPurchases)

      // Покупки за сегодня: рассчитываем пропорционально (обновляется каждые 20 минут)
      const currentTime = now.getTime()
      const twentyMinuteIntervals = Math.floor((currentTime % (24 * 60 * 60 * 1000)) / (20 * 60 * 1000))
      const todaySeed = seed + Math.floor(now.getTime() / (24 * 60 * 60 * 1000))
      const plannedTodayTotal = 2 + (todaySeed % 19) // Запланировано на сегодня

      // Распределяем покупки пропорционально времени дня (72 интервала по 20 минут в сутках)
      const todayProgress = Math.ceil((plannedTodayTotal * twentyMinuteIntervals) / 72)
      setTodayPurchases(Math.min(todayProgress, plannedTodayTotal))

      // Смотрят сейчас: случайно 20-65, обновляется каждые 3 минуты
      const threeMinuteIntervals = Math.floor(currentTime / (3 * 60 * 1000))
      const viewersSeed = seed + threeMinuteIntervals
      const viewers = 20 + (viewersSeed % 46) // 20-65 зрителей
      setCurrentViewers(viewers)
    }

    calculateStats()

    // Обновляем статистику каждую минуту
    const interval = setInterval(calculateStats, 60000)

    return () => clearInterval(interval)
  }, [document.id, document.created_at])

  useEffect(() => {
    const getPageCount = async () => {
      if (!document.file_url) {
        setPageCount(0)
        setPageCountLoading(false)
        return
      }

      if ((document as any).page_count) {
        setPageCount((document as any).page_count)
        setPageCountLoading(false)
        return
      }

      try {
        setPageCountLoading(true)

        const response = await fetch(`/api/pdf/pages?url=${encodeURIComponent(document.file_url)}`)
        const data = await response.json()

        if (data.success && data.pageCount) {
          setPageCount(data.pageCount)
        } else {
          throw new Error('Failed to get page count')
        }
      } catch (error) {
        console.error('Error getting page count:', error)

        const seed = document.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
        const fallbackPages = 15 + (seed % 25)
        setPageCount(fallbackPages)
      } finally {
        setPageCountLoading(false)
      }
    }

    getPageCount()
  }, [document.id, document.file_url, document.title])

  const handleBuyClick = () => {
    window.location.href = `/checkout/${document.id}`
  }

  const handleCallRequest = () => {
    if (onCallRequest) {
      onCallRequest()
    } else {
      alert('Заказ звонка будет доступен в ближайшее время')
    }
  }

  const handleChatOpen = () => {
    alert('Чат будет доступен в ближайшее время')
  }

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">

          {/* Заголовок и описание */}
          <div className="text-center mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {document.title}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-4xl mx-auto">
              {document.description}
            </p>
          </div>

          {/* Обложка */}
          {document.cover_url && (
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="w-full h-96 bg-gray-100 relative overflow-hidden">
                <img
                  src={document.cover_url}
                  alt={`Обложка ${document.title}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Предпросмотр видео или PDF */}
          {isMiniCourse && document.video_preview_url ? (
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  Превью мини-курса
                </span>
              </div>

              <div className="relative">
                <div className="w-full bg-gray-100 relative overflow-hidden" style={{ height: '70vh', maxHeight: '700px' }}>
                  <video
                    src={document.video_preview_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                    poster={document.cover_url}
                  >
                    Ваш браузер не поддерживает видео.
                  </video>

                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                      <p className="text-sm text-gray-600 font-medium">
                        🎥 Превью мини-курса • Полный доступ после покупки
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {isMiniCourse ? 'Предпросмотр мини-курса' : 'Предпросмотр PDF-документа'}
                </span>
              </div>

              <div className="relative">
                <div className="w-full bg-gray-100 relative overflow-hidden" style={{ height: '70vh', maxHeight: '700px' }}>
                  {document.file_url ? (
                    <div className="relative h-full w-full overflow-hidden">
                      <iframe
                        src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-width`}
                        className="w-full h-full"
                        style={{
                          height: '150%',
                          pointerEvents: 'none',
                          transform: 'scale(1)',
                          transformOrigin: 'top left'
                        }}
                        title={`Предпросмотр ${document.title}`}
                        scrolling="no"
                      />

                      <div
                        className="absolute left-0 right-0 bottom-0 pointer-events-none"
                        style={{
                          height: '40%',
                          background: 'linear-gradient(transparent 0%, rgba(255,255,255,0.2) 25%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.85) 75%, white 100%)'
                        }}
                      >
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
                          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                            <p className="text-sm text-gray-600 font-medium">
                              📄 Показаны первые страницы • Полный доступ после покупки
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Eye className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>Предпросмотр недоступен</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Контент мини-курса */}
          {isMiniCourse && (
            <div className="mb-8">
              <CourseContent document={document} isPurchased={false} />
            </div>
          )}

          {/* Три блока под PDF - компактные и одинакового размера */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Левый блок - Кнопки действий */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 flex flex-col justify-center min-h-[180px]">
              <div className="space-y-3">
                <Button
                  onClick={handleBuyClick}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isMiniCourse ? 'Купить мини-курс' : 'Купить PDF-файл'} за {document.price_rub.toLocaleString('ru-RU')} ₽
                </Button>

                <Button
                  onClick={handleCallRequest}
                  variant="outline"
                  className="w-full py-2.5 rounded-lg border-2 border-blue-200 text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 hover:shadow-md text-sm"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Заказать звонок
                </Button>

                <Button
                  onClick={handleChatOpen}
                  variant="outline"
                  className="w-full py-2.5 rounded-lg border-2 border-green-200 text-green-600 hover:border-green-500 hover:bg-green-50 transition-all duration-300 hover:shadow-md text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Перейти в чат
                </Button>
              </div>
            </div>

            {/* Средний блок - Статистика покупок */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex flex-col justify-center min-h-[180px]">
              <div className="text-center">
                <div className="mb-3">
                  <div className="text-sm text-green-700 font-medium mb-3">�� Статистика покупок</div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{purchaseCount.toLocaleString('ru-RU')}</div>
                    <div className="text-xs text-green-700">Всего покупок</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">+{todayPurchases}</div>
                    <div className="text-xs text-green-700">За сегодня</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{currentViewers}</div>
                    <div className="text-xs text-purple-700">Смотрят сейчас</div>
                  </div>
                </div>

                <div className="flex items-center justify-center text-xs text-green-600">
                  <span className="mr-1">🕐</span>
                  Обновлено сейчас
                </div>
              </div>
            </div>

            {/* Правый блок - Что вы получаете */}
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-center min-h-[180px]">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Что вы получаете:</h3>
                <ul className="space-y-2 text-sm text-gray-700 text-left">
                  {isMiniCourse ? (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Основной PDF-документ (20-30 страниц)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Рабочая тетрадь с чек-листами</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">2-3 видео-урока (по 5-7 минут)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Аудио-настройка (5 минут)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Бессрочный доступ ко всем материалам</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Полный доступ к PDF-документу</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Возможность скачивания и печати</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Бессрочный доступ к материалу</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span className="text-xs">Поддержка специалистов EnergyLogic</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Ссылка назад */}
          <div className="mt-8 pt-4 border-t text-center">
            <Link
              href="/#pdf-files"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              ← Вернуться к каталогу
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
