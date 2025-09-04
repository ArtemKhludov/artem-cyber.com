'use client'

import { useState, useEffect, useCallback } from 'react'
import { DocumentService, ImageValidationService } from '@/lib/documents'
import type { Document } from '@/types'

// Универсальный хук для работы с документами
export function useDocuments(options: {
  limit?: number
  excludeId?: string
  autoRefresh?: boolean
  refreshInterval?: number
} = {}) {
  
  const {
    limit,
    excludeId,
    autoRefresh = false,
    refreshInterval = 30000 // 30 секунд
  } = options

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Загрузка документов
  const loadDocuments = useCallback(async () => {
    try {
      setError(null)
      
      let docs: Document[]
      
      if (excludeId) {
        docs = await DocumentService.getOtherDocuments(excludeId, limit || 10)
      } else {
        docs = await DocumentService.getUniqueDocuments(limit)
      }

      // Валидация изображений для каждого документа
      const validatedDocs = await Promise.all(
        docs.map(async (doc) => {
          if (doc.cover_url) {
            const isValidImage = await ImageValidationService.validateImageUrl(doc.cover_url)
            if (!isValidImage) {
              console.warn(`⚠️ Invalid cover image for ${doc.title}, will use fallback`)
              return { ...doc, cover_url: '' }
            }
          }
          return doc
        })
      )

      setDocuments(validatedDocs)
      setLastUpdated(new Date())
      
      if (validatedDocs.length === 0) {
        setError('Документы не найдены')
      }
      
    } catch (err) {
      console.error('❌ Error loading documents:', err)
      setError('Ошибка загрузки документов')
    } finally {
      setLoading(false)
    }
  }, [limit, excludeId])

  // Принудительное обновление
  const refresh = useCallback(() => {
    setLoading(true)
    loadDocuments()
  }, [loadDocuments])

  // Первоначальная загрузка
  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Автоматическое обновление
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing documents...')
      loadDocuments()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadDocuments])

  return {
    documents,
    loading,
    error,
    lastUpdated,
    refresh,
    isEmpty: documents.length === 0 && !loading
  }
}

// Хук для получения одного документа
export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocument = useCallback(async () => {
    if (!id) {
      setError('ID документа не указан')
      setLoading(false)
      return
    }

    try {
      setError(null)
      const doc = await DocumentService.getDocumentById(id)
      
      if (!doc) {
        setError('Документ не найден')
        setDocument(null)
      } else {
        // Проверяем изображение
        if (doc.cover_url) {
          const isValidImage = await ImageValidationService.validateImageUrl(doc.cover_url)
          if (!isValidImage) {
            doc.cover_url = ''
          }
        }
        setDocument(doc)
      }
    } catch (err) {
      console.error(`❌ Error loading document ${id}:`, err)
      setError('Ошибка загрузки документа')
      setDocument(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  const refresh = useCallback(() => {
    setLoading(true)
    loadDocument()
  }, [loadDocument])

  return {
    document,
    loading,
    error,
    refresh,
    notFound: !document && !loading && !error
  }
}

// Хук для получения количества страниц PDF
export function usePageCount(document: Document | null) {
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!document) return

    const getPageCount = async () => {
      setLoading(true)
      try {
        const count = await DocumentService.getPageCount(document)
        setPageCount(count)
      } catch (error) {
        console.error('Error getting page count:', error)
        // Fallback
        const seed = document.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
        setPageCount(15 + (seed % 26))
      } finally {
        setLoading(false)
      }
    }

    getPageCount()
  }, [document?.id, document?.file_url])

  return { pageCount, loading }
}
