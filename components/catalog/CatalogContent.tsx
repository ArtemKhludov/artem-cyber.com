'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText, Eye, ShoppingCart, Search, Filter } from 'lucide-react'
import type { Document } from '@/types'

interface CatalogContentProps {
  documents: Document[]
}

export function CatalogContent({ documents }: CatalogContentProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'price_rub' | 'title'>('created_at')

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'price_rub':
        return a.price_rub - b.price_rub
      case 'title':
        return a.title.localeCompare(b.title)
      case 'created_at':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Каталог <span className="text-blue-600">PDF-документов</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Полная библиотека материалов для самостоятельной работы и глубокого самопознания
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">По дате</option>
              <option value="title">По названию</option>
              <option value="price_rub">По цене</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Найдено документов: <span className="font-semibold">{sortedDocuments.length}</span>
          </p>
        </div>

        {/* Documents Grid */}
        {sortedDocuments.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Документы не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={doc.cover_url} 
                    alt={doc.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-center">
                      <Eye className="w-8 h-8 text-white mx-auto mb-2" />
                      <p className="text-white text-sm">Предпросмотр</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                    {doc.description}
                  </p>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-gray-900">
                      {doc.price_rub.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                      <Link href={`/pdf/${doc.id}`}>
                        <Eye className="mr-2 w-4 h-4" />
                        Предпросмотр
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                      <Link href={`/checkout?product=pdf&id=${doc.id}`}>
                        <ShoppingCart className="mr-2 w-4 h-4" />
                        Купить сейчас
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Нужна персональная консультация?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Наши специалисты помогут выбрать подходящие материалы и составить индивидуальную программу развития
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/book">Записаться на консультацию</Link>
            </Button>
            <Button asChild variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
              <Link href="/contacts">Связаться с нами</Link>
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
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
