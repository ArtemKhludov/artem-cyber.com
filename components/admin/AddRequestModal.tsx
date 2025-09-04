'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Package, 
  MessageSquare,
  Save,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Document {
  id: string
  name: string
  description?: string
}

interface Program {
  id: string
  name: string
  description?: string
}

interface AddRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddRequestModal({ isOpen, onClose, onSuccess }: AddRequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'manual' as 'website' | 'phone' | 'manual' | 'chat' | 'other',
    product_type: '' as 'pdf' | 'program' | 'consultation' | 'other',
    product_id: '',
    product_name: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: '',
    description: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
      fetchPrograms()
    }
  }, [isOpen])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, description')
        .order('name')

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const fetchPrograms = async () => {
    setPrograms([
      { id: 'deep-day', name: 'Глубокий день', description: 'Мини-сессия "Глубокий день"' },
      { id: '21-days', name: '21 день', description: 'Программа "21 день"' }
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          product_type: formData.product_type,
          product_name: formData.product_name,
          notes: formData.notes,
          source_page: 'admin'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка при добавлении заявки')
      }

      const { data } = await response.json()

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error adding request:', error)
      alert('Ошибка при добавлении заявки')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'manual',
      product_type: 'other',
      product_id: '',
      product_name: '',
      priority: 'medium',
      notes: '',
      description: ''
    })
    onClose()
  }

  const handleProductTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      product_type: type as any,
      product_id: '',
      product_name: ''
    }))
  }

  const handleProductChange = (productId: string) => {
    let productName = ''
    
    if (formData.product_type === 'pdf') {
      const doc = documents.find(d => d.id === productId)
      productName = doc?.name || ''
    } else if (formData.product_type === 'program') {
      const prog = programs.find(p => p.id === productId)
      productName = prog?.name || ''
    }

    setFormData(prev => ({
      ...prev,
      product_id: productId,
      product_name: productName
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl transform transition-all animate-in zoom-in-95 duration-300 border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Добавить заявку</h2>
              <button
                onClick={handleClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-white/70 mt-1">Создание новой заявки от клиента</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя клиента *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите имя клиента"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Источник заявки
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="manual">Ручной ввод</option>
                  <option value="phone">Телефон</option>
                  <option value="chat">Чат</option>
                  <option value="website">Сайт</option>
                  <option value="other">Другое</option>
                </select>
              </div>
            </div>

            {/* Контакты */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
            </div>

            {/* Товар/Услуга */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип товара/услуги
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => handleProductTypeChange('pdf')}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      formData.product_type === 'pdf'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">PDF файл</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleProductTypeChange('program')}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      formData.product_type === 'program'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Package className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">Программа</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleProductTypeChange('consultation')}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      formData.product_type === 'consultation'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <MessageSquare className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">Консультация</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleProductTypeChange('other')}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      formData.product_type === 'other'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <User className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">Другое</span>
                  </button>
                </div>
              </div>

              {formData.product_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Выберите {formData.product_type === 'pdf' ? 'PDF файл' : formData.product_type === 'program' ? 'программу' : 'услугу'}
                  </label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Выберите...</option>
                    {formData.product_type === 'pdf' && documents.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                    {formData.product_type === 'program' && programs.map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                    {formData.product_type === 'consultation' && (
                      <>
                        <option value="consultation-30">Консультация 30 мин</option>
                        <option value="consultation-60">Консультация 60 мин</option>
                        <option value="consultation-90">Консультация 90 мин</option>
                      </>
                    )}
                    {formData.product_type === 'other' && (
                      <option value="custom">Другое (указать в заметках)</option>
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Приоритет и заметки */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Приоритет
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="urgent">Срочно</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание (опционально)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Дополнительная информация о заявке..."
                />
              </div>
            </div>

            {/* Заметки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Заметки для менеджера
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Важные детали, пожелания клиента, контекст заявки..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.name}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Добавление...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Добавить заявку
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
