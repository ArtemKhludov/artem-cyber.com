'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  CreditCard,
  Package,
  Save,
  Loader2,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Document {
  id: string
  title: string
  description?: string
  id: string
  name: string
  description?: string
}

interface Program {
  id: string
  name: string
  description?: string
}

interface AddPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddPurchaseModal({ isOpen, onClose, onSuccess }: AddPurchaseModalProps) {
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    product_name: '',
    product_id: '',
    amount: '',
    currency: 'RUB',
    payment_method: 'card',
    status: 'completed' as 'pending' | 'completed' | 'cancelled',
    notes: ''
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
        .select('id, title, description')
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
      // Добавляем покупку напрямую в таблицу purchase_requests
      const { data, error } = await supabase
        .from('purchase_requests')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          product_name: formData.product_name,
          product_id: formData.product_id,
          amount: parseFloat(formData.amount) || 0,
          currency: formData.currency,
          payment_method: formData.payment_method,
          status: formData.status,
          notes: formData.notes,
          source: 'manual'
        }])
        .select()

      if (error) throw error

      // Синхронизируем с Google Sheets
      await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'purchases' })
      })

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error adding purchase:', error)
      alert('Ошибка при добавлении покупки')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      product_name: '',
      product_id: '',
      amount: '',
      currency: 'RUB',
      payment_method: 'card',
      status: 'completed',
      notes: ''
    })
    onClose()
  }

  const handleProductChange = (productId: string) => {
    let productName = ''
    
    const doc = documents.find(d => d.id === productId)
    if (doc) {
      productName = doc.title
    } else {
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
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Добавить покупку</h2>
              <button
                onClick={handleClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-white/70 mt-1">Регистрация новой покупки</p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Введите имя клиента"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Статус покупки
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="completed">Завершена</option>
                  <option value="pending">В обработке</option>
                  <option value="cancelled">Отменена</option>
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
            </div>

            {/* Товар */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите товар/услугу
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Выберите товар...</option>
                  <optgroup label="PDF файлы">
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.title}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Программы">
                    {programs.map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Оплата */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сумма *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Валюта
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Способ оплаты
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="card">Банковская карта</option>
                  <option value="cash">Наличные</option>
                  <option value="transfer">Банковский перевод</option>
                  <option value="crypto">Криптовалюта</option>
                </select>
              </div>
            </div>

            {/* Заметки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Заметки
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Дополнительная информация о покупке..."
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
              disabled={loading || !formData.name || !formData.amount}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Добавление...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Добавить покупку
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
