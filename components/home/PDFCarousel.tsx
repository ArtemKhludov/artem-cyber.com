'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { DocumentCard } from '@/components/common/DocumentCard'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'

export function PDFCarousel() {
  const [isVisible, setIsVisible] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // Функции управления каруселью
  const nextSlide = () => {
    if (documents.length === 0) return
    const nextIndex = (currentIndex + 1) % documents.length
    setCurrentIndex(nextIndex)
    if (carouselRef.current) {
      const translateX = -(nextIndex * 400)
      carouselRef.current.style.transform = `translateX(${translateX}px)`
      carouselRef.current.style.transition = "transform 0.5s ease"
      setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.style.transition = ""
        }
      }, 500)
    }
  }

  const prevSlide = () => {
    if (documents.length === 0) return
    const prevIndex = currentIndex === 0 ? documents.length - 1 : currentIndex - 1
    setCurrentIndex(prevIndex)
    if (carouselRef.current) {
      const translateX = -(prevIndex * 400)
      carouselRef.current.style.transform = `translateX(${translateX}px)`
      carouselRef.current.style.transition = "transform 0.5s ease"
      setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.style.transition = ""
        }
      }, 500)
    }
  }

  // Загрузка документов из Supabase
  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (fetchError) {
        throw fetchError
      }

      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
    
    // Автообновление каждую минуту
    const interval = setInterval(loadDocuments, 60000)
    
    return () => clearInterval(interval)
  }, [])

  // Intersection Observer для анимаций
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-blue-400/20 rounded-lg w-64 mx-auto mb-4"></div>
            <div className="h-12 bg-white/10 rounded-lg w-96 mx-auto mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-white/10 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-400">Ошибка загрузки: {error}</p>
          <Button onClick={loadDocuments} className="mt-4">
            Попробовать снова
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section 
      ref={sectionRef}
      id="pdf-files" 
      className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div 
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'60\' height=\'60\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 60 0 L 0 0 0 60\' fill=\'none\' stroke=\'white\' stroke-width=\'0.5\' opacity=\'0.05\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\' /%3E%3C/svg%3E")'
            }}
            className="w-full h-full"
          ></div>
        </div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">PDF-руководства</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            PDF-руководство для
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> самостоятельной работы</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Практические руководства, разработанные экспертами для вашего личностного роста
          </p>
        </div>

        {!loading && !error && documents.length > 0 && (
          <div className="relative overflow-hidden group">
            {/* Стрелки управления */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
            <div 
              className="carousel-container" 
              onMouseEnter={(e) => e.currentTarget.style.animationPlayState = 'paused'} 
              onMouseLeave={(e) => e.currentTarget.style.animationPlayState = 'running'}
            >
              <div 
                ref={carouselRef}
                className="carousel-track flex gap-8" 
                style={{ 
                  animation: 'infiniteScroll 50s linear infinite',
                  width: `${documents.length * 2 * 400}px`
                }}
              >
                {/* Первый набор документов */}
                {documents.map((doc, index) => (
                  <div
                    key={`${doc.id}-first-${index}`}
                    className="flex-shrink-0 w-96 transform transition-all duration-300 hover:scale-105"
                  >
                    <DocumentCard 
                      document={doc}
                      variant="default"
                      showBuyButton={true}
                      className="h-full"
                    />
                  </div>
                ))}
                {/* Второй набор документов для бесконечности */}
                {documents.map((doc, index) => (
                  <div
                    key={`${doc.id}-second-${index}`}
                    className="flex-shrink-0 w-96 transform transition-all duration-300 hover:scale-105"
                  >
                    <DocumentCard 
                      document={doc}
                      variant="default"
                      showBuyButton={true}
                      className="h-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View all button */}
        <div className="text-center mt-12">
          <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <Link href="/catalog">
              <Eye className="mr-2 w-4 h-4" />
              Посмотреть все материалы
            </Link>
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes infiniteScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .carousel-container {
          width: 100%;
        }

        .carousel-track {
          animation-play-state: running;
        }

        .carousel-container:hover .carousel-track {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
