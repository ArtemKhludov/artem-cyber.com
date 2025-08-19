import { supabase } from './supabase'
import type { Document } from '@/types'


// Универсальный сервис для работы с документами
export class DocumentService {
  
  // Получить все документы с автоматической дедупликацией и валидацией
  static async getAllDocuments(): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching documents:', error)
        return fallbackDocuments
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No documents found, using fallback')
        return fallbackDocuments
      }

      // Валидация и очистка данных
      const validDocuments = data
        .filter(this.validateDocument)
        .map(this.sanitizeDocument)

      console.log(`✅ Loaded ${validDocuments.length} valid documents`)
      return validDocuments

    } catch (error) {
      console.error('❌ Error in getAllDocuments:', error)
      return fallbackDocuments
    }
  }

  // Получить уникальные документы (автоматическое удаление дубликатов)
  static async getUniqueDocuments(limit?: number): Promise<Document[]> {
    try {
      const documents = await this.getAllDocuments()
      
      // Удаляем дубликаты по title (берем самый новый)
      const uniqueMap = new Map<string, Document>()
      
      documents.forEach(doc => {
        const key = doc.title.trim().toLowerCase()
        const existing = uniqueMap.get(key)
        
        if (!existing || new Date(doc.updated_at) > new Date(existing.updated_at)) {
          uniqueMap.set(key, doc)
        }
      })
      
      let uniqueDocuments = Array.from(uniqueMap.values())
      
      // Сортируем по актуальности
      uniqueDocuments.sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime()
        const dateB = new Date(b.updated_at).getTime()
        return dateB - dateA
      })
      
      // Применяем лимит если указан
      if (limit && limit > 0) {
        uniqueDocuments = uniqueDocuments.slice(0, limit)
      }
      
      console.log(`📄 Returning ${uniqueDocuments.length} unique documents`)
      return uniqueDocuments

    } catch (error) {
      console.error('❌ Error in getUniqueDocuments:', error)
      return limit ? fallbackDocuments.slice(0, limit) : fallbackDocuments
    }
  }

  // Получить документ по ID с валидацией
  static async getDocumentById(id: string): Promise<Document | null> {
    try {
      if (!id || typeof id !== 'string') {
        console.error('❌ Invalid document ID provided')
        return null
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error(`❌ Error fetching document ${id}:`, error)
        return null
      }

      if (!data) {
        console.warn(`⚠️ Document ${id} not found`)
        return null
      }

      if (!this.validateDocument(data)) {
        console.error(`❌ Document ${id} failed validation`)
        return null
      }

      const sanitizedDoc = this.sanitizeDocument(data)
      console.log(`✅ Loaded document: ${sanitizedDoc.title}`)
      return sanitizedDoc

    } catch (error) {
      console.error(`❌ Error in getDocumentById(${id}):`, error)
      return null
    }
  }

  // Получить другие документы (исключая текущий)
  static async getOtherDocuments(currentId: string, limit: number = 5): Promise<Document[]> {
    try {
      const allDocuments = await this.getUniqueDocuments()
      const otherDocuments = allDocuments
        .filter(doc => doc.id !== currentId)
        .slice(0, Math.max(1, limit))
      
      console.log(`📚 Found ${otherDocuments.length} other documents`)
      return otherDocuments

    } catch (error) {
      console.error('❌ Error in getOtherDocuments:', error)
      return fallbackDocuments.slice(0, limit)
    }
  }

  // Валидация документа
  private static validateDocument(doc: any): boolean {
    if (!doc || typeof doc !== 'object') return false
    
    // Обязательные поля
    const requiredFields = ['id', 'title', 'description', 'price_rub', 'file_url']
    for (const field of requiredFields) {
      if (!doc[field] || (typeof doc[field] === 'string' && doc[field].trim() === '')) {
        console.warn(`⚠️ Document missing required field: ${field}`)
        return false
      }
    }

    // Валидация типов
    if (typeof doc.price_rub !== 'number' || doc.price_rub <= 0) {
      console.warn(`⚠️ Invalid price for document: ${doc.title}`)
      return false
    }

    // Валидация URL
    if (!this.isValidUrl(doc.file_url)) {
      console.warn(`⚠️ Invalid file_url for document: ${doc.title}`)
      return false
    }

    if (doc.cover_url && !this.isValidUrl(doc.cover_url)) {
      console.warn(`⚠️ Invalid cover_url for document: ${doc.title}`)
      // Не возвращаем false, просто предупреждение
    }

    return true
  }

  // Очистка и нормализация данных документа
  private static sanitizeDocument(doc: any): Document {
    return {
      id: doc.id.trim(),
      title: doc.title.trim(),
      description: doc.description.trim(),
      price: doc.price || doc.price_rub,
      price_rub: Number(doc.price_rub),
      file_url: doc.file_url.trim(),
      cover_url: doc.cover_url?.trim() || null,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      page_count: doc.page_count || null
    }
  }

  // Проверка валидности URL
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  // Получить количество страниц с кешированием
  static async getPageCount(document: Document): Promise<number> {
    // Если есть сохраненное количество страниц
    if (document.page_count && document.page_count > 0) {
      return document.page_count
    }

    // Запрашиваем через API
    try {
      const response = await fetch(`/api/pdf/pages?url=${encodeURIComponent(document.file_url)}`)
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.pageCount && data.pageCount > 0) {
        console.log(`📄 Got page count for ${document.title}: ${data.pageCount}`)
        return data.pageCount
      }
    } catch (error) {
      console.error(`❌ Error fetching page count for ${document.title}:`, error)
    }

    // Fallback: консистентное число на основе ID
    const seed = document.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    const fallbackPages = 15 + (seed % 26) // 15-40 страниц
    console.log(`🎲 Using fallback page count for ${document.title}: ${fallbackPages}`)
    return fallbackPages
  }
}

// Сервис для статистики покупок
export class PurchaseStatsService {
  
  static calculatePurchaseStats(documentId: string, createdAt: string) {
    const createdDate = new Date(createdAt)
    const now = new Date()
    const daysSinceLaunch = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Генерируем консистентную статистику на основе ID
    const seed = documentId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    const basePurchases = 20 + (seed % 81) // 20-100
    
    // Рост 1% в день
    const totalPurchases = Math.floor(basePurchases * Math.pow(1.01, Math.max(0, daysSinceLaunch)))
    
    // Покупки за сегодня
    const todayPurchases = Math.max(0, (seed + daysSinceLaunch) % 6)
    
    // Активные пользователи
    const activeUsers = Math.max(1, 1 + ((seed * daysSinceLaunch) % 8))
    
    return {
      total: totalPurchases,
      today: todayPurchases,
      active: activeUsers
    }
  }
}

// Fallback данные для надежности
export const fallbackDocuments: Document[] = [
  {
    id: "fallback-1",
    title: "EnergyLogic: Искусство Перекалибровки Реальности",
    description: "Исследование глубинных механизмов трансформации восприятия и многоуровневой работы с слоями реальности",
    price: 199,
    price_rub: 199,
    file_url: "#",
    cover_url: "/images/fallback-cover-1.jpg",
    created_at: "2025-01-16T12:00:00Z",
    updated_at: "2025-01-16T12:00:00Z",
    page_count: 35
  },
  {
    id: "fallback-2", 
    title: "Карта Самопознания: Когда Я Ничего Не Понимаю",
    description: "Путешествие к истинному пониманию себя — это непрерывный процесс трансформации",
    price: 199,
    price_rub: 199,
    file_url: "#",
    cover_url: "/images/fallback-cover-2.jpg",
    created_at: "2025-01-16T12:00:00Z",
    updated_at: "2025-01-16T12:00:00Z",
    page_count: 28
  }
]

// Утилиты для проверки доступности изображений
export class ImageValidationService {
  
  // Проверить доступность изображения
  static async validateImageUrl(url: string): Promise<boolean> {
    if (!url) return false
    
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok && response.headers.get('content-type')?.startsWith('image/')
    } catch {
      return false
    }
  }

  // Получить fallback изображение на основе title
  static getFallbackImage(title: string): string {
    const hash = title.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-blue-600', 
      'from-purple-500 to-pink-600',
      'from-orange-500 to-red-600',
      'from-teal-500 to-green-600'
    ]
    
    return `bg-gradient-to-br ${colors[hash % colors.length]}`
  }
}
