'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Filter, Eye, ShoppingCart, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

// Компонент карточки документа с анимацией
function DocumentCard({ document, index }: { document: Document; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [pdfPreviewLoaded, setPdfPreviewLoaded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Добавляем задержку для каскадной анимации
          setTimeout(() => {
            setIsVisible(true)
          }, index * 100)
        }
      },
      { threshold: 0.1 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [index])

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div
      ref={cardRef}
      className={`transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group h-full border border-gray-100 transform hover:scale-[1.02]">

        {/* PDF Preview Section */}
        <div className="relative h-64 overflow-hidden">
          {/* Обложка как фон */}
          {!imageError && document.cover_url && (
            <img
              src={document.cover_url}
              alt={document.title}
              className="absolute inset-0 w-full h-full object-contain bg-gray-50"
              onError={handleImageError}
            />
          )}

          {/* Fallback градиент если нет обложки */}
          {(imageError || !document.cover_url) && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-white/80 mx-auto mb-2" />
                <p className="text-white/80 text-sm font-medium">PDF документ</p>
              </div>
            </div>
          )}

          {/* PDF Preview Overlay */}
          {document.file_url && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <iframe
                src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-fit`}
                className="w-full h-full pointer-events-none"
                title={`Предпросмотр ${document.title}`}
                onLoad={() => setPdfPreviewLoaded(true)}
              />

              {/* Overlay для читаемости */}
              <div className="absolute inset-0 bg-black/20"></div>

              {/* Индикатор предпросмотра */}
              <div className="absolute top-4 left-4 bg-white/90 rounded-lg px-3 py-1 text-xs font-medium text-gray-700">
                📄 Первая страница
              </div>
            </div>
          )}

          {/* Hover Action Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-center text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <Eye className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium">Предпросмотр PDF</p>
            </div>
          </div>

          {/* Price Tag */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {(document as any).originalPrice ? (
              <div className="text-center">
                <div className="line-through text-xs opacity-75">{(document as any).originalPrice.toLocaleString('ru-RU')} ₽</div>
                <div>{document.price_rub.toLocaleString('ru-RU')} ₽</div>
              </div>
            ) : (
              <div>{document.price_rub.toLocaleString('ru-RU')} ₽</div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 leading-tight">
            {document.title}
          </h3>

          <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
            {document.description}
          </p>

          {/* Информация о рабочих тетрадях */}
          {document.has_workbook && (document.workbook_count || 0) > 0 && (
            <div className="mb-4">
              <div className="flex items-center text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 mr-2" />
                <span className="font-medium">
                  {document.workbook_count || 0} рабоч{(document.workbook_count || 0) === 1 ? 'ая тетрадь' :
                    (document.workbook_count || 0) < 5 ? 'ие тетради' : 'ых тетрадей'}
                </span>
              </div>
                    {document.workbooks && document.workbooks.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                            {document.workbooks.map((workbook, index) => (
                                <div key={workbook.id} className="flex items-center justify-between">
                                    <span className="truncate">
                                        {index + 1}. {workbook.title}
                                    </span>
                                    {workbook.video_url && (
                                        <span className="text-blue-600 ml-2">🎥</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              asChild
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Link href={`/courses/${document.id}`}>
                <Eye className="mr-2 w-4 h-4" />
                Посмотреть подробнее
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full border-2 border-blue-200 text-blue-600 hover:border-blue-500 hover:bg-blue-50 py-2 rounded-xl transition-all duration-300"
            >
              <Link href={`/checkout/${document.id}`}>
                <ShoppingCart className="mr-2 w-4 h-4" />
                Купить сейчас
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CatalogPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'title'>('date')
  const [isHeaderVisible, setIsHeaderVisible] = useState(false)
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
  }

  // Анимация заголовка
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsHeaderVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (headerRef.current) {
      observer.observe(headerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Загрузка документов
  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      // Используем наш API с обновленными ценами
      const response = await fetch('/api/documents')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка загрузки документов')
      }

      if (result.data && result.data.length > 0) {
        setDocuments(result.data)
        console.log(`✅ Загружено ${result.data.length} документов в каталог с обновленными ценами`)
      } else {
        console.log('⚠️ Документы не найдены')
        setError('Документы не найдены')
      }
    } catch (err) {
      console.error('❌ Error loading documents for catalog:', err)
      setError('Ошибка загрузки документов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  // Сортировка документов
  const sortedDocuments = [...documents].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price_rub - b.price_rub
      case 'title':
        return a.title.localeCompare(a.title, 'ru')
      case 'date':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  const refresh = () => {
    loadDocuments()
  }

  return (
    <div className="relative">
      {/* Главное меню */}
      <MainHeader onCallRequest={handleCallRequest} />

      {/* Основной контент */}
      <main ref={sectionRef}>
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Каталог PDF-материалов
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-12 text-blue-100 leading-relaxed">
                Полная коллекция методик и руководств для трансформации личности
              </p>
            </div>
          </div>
        </section>

        {/* Основной контент */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">

              {/* Controls */}
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8 border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">

                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700 font-medium">Сортировка:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="date">По дате добавления</option>
                      <option value="price">По цене</option>
                      <option value="title">По названию</option>
                    </select>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">{sortedDocuments.length}</span> материалов доступно
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
                  <span className="text-gray-600 text-lg">Загружаем каталог...</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-20">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
                    <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <p className="text-red-600 mb-6 text-lg">{error}</p>
                    <Button onClick={refresh} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                      Попробовать снова
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && documents.length === 0 && (
                <div className="text-center py-20">
                  <FileText className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-gray-600 mb-4">Каталог временно пуст</h3>
                  <p className="text-gray-500 text-lg">Материалы будут добавлены в ближайшее время</p>
                </div>
              )}

              {/* Documents Grid - 2 колонки для лучшей читаемости */}
              {!loading && !error && sortedDocuments.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sortedDocuments.map((document, index) => (
                      <DocumentCard
                        key={document.id}
                        document={document}
                        index={index}
                      />
                    ))}
                  </div>

                  {/* Statistics */}
                  <div className="mt-16">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Статистика каталога</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-1">{sortedDocuments.length}</div>
                          <div className="text-gray-600">Всего материалов</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600 mb-1">50K+</div>
                          <div className="text-gray-600">Довольных клиентов</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-1">24/7</div>
                          <div className="text-gray-600">Поддержка</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-6 text-center">
                        Каталог автоматически обновляется при добавлении новых материалов
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Готовы начать свое путешествие к самопознанию?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам людей, которые уже изменили свою жизнь с помощью EnergyLogic
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCallRequest} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Заказать звонок
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/book">
                  Записаться на сессию
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Call request modal */}
      <CallRequestModal
        isOpen={isCallModalOpen}
        onClose={handleCloseCallModal}
      />

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
