'use client'

import React, { useState, useEffect, useRef } from 'react'
import { PDFPreview } from '@/components/pdf/PDFPreview'
import { DocumentCard } from '@/components/common/DocumentCard'
import { PageLayout } from '@/components/layout/PageLayout'
import { MockReviews } from '@/components/pdf/MockReviews'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'

export const dynamic = 'force-dynamic'

interface PDFPageProps {
  params: Promise<{ id: string }>
}

export default function PDFPage({ params }: PDFPageProps) {
  const { id } = React.use(params)
  const [document, setDocument] = useState<Document | null>(null)
  const [otherDocuments, setOtherDocuments] = useState<Document[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const pdfCarouselRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true)
        setError(null)

        // Загружаем основной документ
        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single()

        if (docError) {
          throw new Error('Документ не найден')
        }

        setDocument(document)

        // Загружаем другие документы
        const { data: others, error: othersError } = await supabase
          .from('documents')
          .select('*')
          .neq('id', id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!othersError && others) {
          setOtherDocuments(others)
          setLoading(false)
        }

      } catch (err) {
        console.error('Error loading document:', err)
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadDocument()
    }
  }, [id])

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    )
  }

  if (error || !document) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Документ не найден
            </h1>
            <p className="text-gray-600 mb-6">
              {error || 'Запрошенный документ не существует или был удален'}
            </p>
            <div className="space-x-4">
              <Button asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  На главную
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/catalog">
                  Каталог
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">

        <PDFPreview document={document} />

        <MockReviews />

        {otherDocuments.length > 0 && (
          <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-full opacity-20">
                <div
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='0.5' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
                  }}
                  className="w-full h-full"
                ></div>
              </div>
              <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Курсы</span>
                <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
                  Другие полезные
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {" "}материалы
                  </span>
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Откройте для себя больше практических руководств для личностного роста
                </p>
              </div>

              {/* БЕСКОНЕЧНАЯ КАРУСЕЛЬ СО СТРЕЛКАМИ */}
              <div className="relative overflow-hidden group">
                {/* Стрелки управления */}
                <button
                  onClick={() => {
                    const carousel = pdfCarouselRef.current;
                    if (!carousel) return;
                    carousel.style.animation = "none";
                    const currentTransform = getComputedStyle(carousel).transform;
                    let currentX = 0;
                    if (currentTransform !== "none") {
                      const matrix = new DOMMatrix(currentTransform);
                      currentX = matrix.m41;
                    }
                    const newX = currentX + 320; // Один слайд влево                    carousel.style.transform = `translateX(${newX}px)`;
                    carousel.style.transition = "transform 0.5s ease";
                    setTimeout(() => { // Возобновляем автопрокрутку
                      carousel.style.transition = "";
                      carousel.style.animation = "infiniteScroll 45s linear infinite";
                    }, 600);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
                <button
                  onClick={() => {
                    const carousel = pdfCarouselRef.current;
                    if (!carousel) return;
                    carousel.style.animation = "none";
                    const currentTransform = getComputedStyle(carousel).transform;
                    let currentX = 0;
                    if (currentTransform !== "none") {
                      const matrix = new DOMMatrix(currentTransform);
                      currentX = matrix.m41;
                    }
                    const newX = currentX - 320;
                    carousel.style.transform = `translateX(${newX}px)`;
                    carousel.style.transition = "transform 0.5s ease";
                    setTimeout(() => { // Возобновляем автопрокрутку
                      carousel.style.transition = "";
                      carousel.style.animation = "infiniteScroll 45s linear infinite";
                    }, 600);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="w-6 h-6 text-gray-800" />
                </button>
                <div className="carousel-container">
                  <div ref={pdfCarouselRef} className="carousel-track flex gap-6" style={{ animation: "infiniteScroll 45s linear infinite", width: `${otherDocuments.length * 2 * 350}px` }}>
                    {otherDocuments.map((doc, index) => (
                      <div key={`${doc.id}-${index}`} className="flex-shrink-0 w-80">
                        <DocumentCard document={doc} variant="carousel" showBuyButton={true} className="h-full" />
                      </div>
                    ))}
                    {otherDocuments.map((doc, index) => (
                      <div key={`${doc.id}-dup-${index}`} className="flex-shrink-0 w-80">
                        <DocumentCard document={doc} variant="carousel" showBuyButton={true} className="h-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link href="/catalog">
                    Посмотреть все материалы
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  )
}
