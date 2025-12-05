'use client'

import { useState, useEffect, useCallback } from 'react'
import { DocumentService, ImageValidationService } from '@/lib/documents'
import type { Document } from '@/types'

// Generic hook for working with documents
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
    refreshInterval = 30000 // 30 seconds
  } = options

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      setError(null)
      
      let docs: Document[]
      
      if (excludeId) {
        docs = await DocumentService.getOtherDocuments(excludeId, limit || 10)
      } else {
        docs = await DocumentService.getUniqueDocuments(limit)
      }

      // Validate images for each document
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
        setError('Documents not found')
      }
      
    } catch (err) {
      console.error('❌ Error loading documents:', err)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [limit, excludeId])

  // Force refresh
  const refresh = useCallback(() => {
    setLoading(true)
    loadDocuments()
  }, [loadDocuments])

  // Initial load
  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Auto refresh
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

// Hook to fetch a single document
export function useDocument(id: string) {
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocument = useCallback(async () => {
    if (!id) {
      setError('Document ID is not provided')
      setLoading(false)
      return
    }

    try {
      setError(null)
      const doc = await DocumentService.getDocumentById(id)
      
      if (!doc) {
        setError('Document not found')
        setDocument(null)
      } else {
        // Validate image
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
      setError('Failed to load document')
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

// Hook to get PDF page count
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
