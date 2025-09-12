'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Eye, ShoppingCart } from 'lucide-react'
import type { Document } from '@/types'

interface OtherDocumentsProps {
  documents: Document[]
}

export function OtherDocuments({ documents }: OtherDocumentsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

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

  if (documents.length === 0) {
    return null
  }

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="w-full h-full" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'60\' height=\'60\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 60 0 L 0 0 0 60\' fill=\'none\' stroke=\'white\' stroke-width=\'0.5\' opacity=\'0.05\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\' /%3E%3C/svg%3E")' }}></div>
        </div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Курсы</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            Другие полезные
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> материалы</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Откройте для себя больше практических руководств для личностного роста
          </p>
        </div>

        {/* Бесконечная карусель */}
        <div className="relative overflow-hidden">
          <div
            className="carousel-container"
            onMouseEnter={(e) => e.currentTarget.style.animationPlayState = 'paused'}
            onMouseLeave={(e) => e.currentTarget.style.animationPlayState = 'running'}
          >
            <div
              className="carousel-track flex gap-6"
              style={{
                animation: 'infiniteScroll 60s linear infinite',
                width: `${documents.length * 3 * 350}px`
              }}
            >
              {/* Первый набор документов */}
              {documents.map((doc, index) => (
                <div
                  key={`${doc.id}-first-${index}`}
                  className="flex-shrink-0 w-80 transform transition-all duration-300 hover:scale-105"
                >
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-2xl transition-all duration-300 group h-full">
                    {/* Document Cover */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={doc.cover_url}
                        alt={doc.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      {/* Fallback gradient */}
                      <div className="hidden absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">PDF</span>
                      </div>
                      <div className="absolute inset-0 bg-black/20"></div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Eye className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Предпросмотр</p>
                        </div>
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                        {doc.description}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-white">
                          {doc.price_rub.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Button
                          asChild
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <Link href={`/courses/${doc.id}`}>
                            <Eye className="mr-2 w-4 h-4" />
                            Посмотреть
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full border-blue-200 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400"
                        >
                          <Link href={`/checkout/${doc.id}`}>
                            <ShoppingCart className="mr-2 w-4 h-4" />
                            Купить
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Второй набор документов для бесконечности */}
              {documents.map((doc, index) => (
                <div
                  key={`${doc.id}-second-${index}`}
                  className="flex-shrink-0 w-80 transform transition-all duration-300 hover:scale-105"
                >
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-2xl transition-all duration-300 group h-full">
                    {/* Document Cover */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={doc.cover_url}
                        alt={doc.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      {/* Fallback gradient */}
                      <div className="hidden absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">PDF</span>
                      </div>
                      <div className="absolute inset-0 bg-black/20"></div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Eye className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Предпросмотр</p>
                        </div>
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                        {doc.description}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-white">
                          {doc.price_rub.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Button
                          asChild
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <Link href={`/courses/${doc.id}`}>
                            <Eye className="mr-2 w-4 h-4" />
                            Посмотреть
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full border-blue-200 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400"
                        >
                          <Link href={`/checkout/${doc.id}`}>
                            <ShoppingCart className="mr-2 w-4 h-4" />
                            Купить
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Третий набор для более плавной бесконечности */}
              {documents.map((doc, index) => (
                <div
                  key={`${doc.id}-third-${index}`}
                  className="flex-shrink-0 w-80 transform transition-all duration-300 hover:scale-105"
                >
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-2xl transition-all duration-300 group h-full">
                    {/* Document Cover */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={doc.cover_url}
                        alt={doc.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      {/* Fallback gradient */}
                      <div className="hidden absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">PDF</span>
                      </div>
                      <div className="absolute inset-0 bg-black/20"></div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Eye className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Предпросмотр</p>
                        </div>
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                        {doc.description}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-white">
                          {doc.price_rub.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Button
                          asChild
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <Link href={`/courses/${doc.id}`}>
                            <Eye className="mr-2 w-4 h-4" />
                            Посмотреть
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full border-blue-200 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400"
                        >
                          <Link href={`/checkout/${doc.id}`}>
                            <ShoppingCart className="mr-2 w-4 h-4" />
                            Купить
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* View all button */}
        <div className="text-center mt-12">
          <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <Link href="/catalog">
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

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  )
}
