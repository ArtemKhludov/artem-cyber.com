'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
  X
} from 'lucide-react'
import * as Toast from '@radix-ui/react-toast'

interface CallbackRequest {
  id: string
  name: string
  phone: string
  email: string
  message: string
  status: string
  created_at: string
  conversation_count: number
  last_message_at: string
  conversation_status: string
}

interface ConversationMessage {
  id: string
  message: string
  message_type: string
  sender_type: string
  is_internal: boolean
  file_url?: string
  file_name?: string
  created_at: string
  admin_name?: string
}

export function CallbacksSection() {
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([])
  const [selectedCallback, setSelectedCallback] = useState<CallbackRequest | null>(null)
  const [conversations, setConversations] = useState<ConversationMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [toast, setToast] = useState<{ title: string; description: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchCallbacks()
  }, [])

  useEffect(() => {
    if (selectedCallback) {
      fetchConversations(selectedCallback.id)
    }
  }, [selectedCallback])

  const fetchCallbacks = async () => {
    try {
      const response = await fetch('/api/user/callbacks')
      const result = await response.json()
      
      if (result.success) {
        setCallbacks(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error)
      setToast({
        title: 'Ошибка',
        description: 'Не удалось загрузить обращения',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConversations = async (callbackId: string) => {
    try {
      const response = await fetch(`/api/callback/conversations?callback_request_id=${callbackId}`)
      const result = await response.json()
      
      if (result.success) {
        setConversations(result.data)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedCallback) return

    setIsSending(true)
    try {
      const response = await fetch('/api/callback/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_request_id: selectedCallback.id,
          message: newMessage.trim(),
          message_type: 'text'
        })
      })

      const result = await response.json()

      if (result.success) {
        setNewMessage('')
        fetchConversations(selectedCallback.id)
        fetchCallbacks() // Обновляем список обращений
        setToast({
          title: 'Успешно',
          description: 'Сообщение отправлено',
          type: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setToast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        type: 'error'
      })
    } finally {
      setIsSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Новое'
      case 'contacted': return 'Связались'
      case 'completed': return 'Завершено'
      case 'cancelled': return 'Отменено'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Мои обращения
              {callbacks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {callbacks.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isExpanded ? 'Свернуть' : 'Развернуть'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {callbacks.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">У вас пока нет обращений</p>
              <Button asChild>
                <a href="/#contact">
                  <Plus className="w-4 h-4 mr-2" />
                  Создать обращение
                </a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {callbacks.slice(0, isExpanded ? callbacks.length : 3).map((callback) => (
                <div
                  key={callback.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                    selectedCallback?.id === callback.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedCallback(callback)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{callback.name}</h3>
                        <Badge className={getStatusColor(callback.status)}>
                          {getStatusText(callback.status)}
                        </Badge>
                        {callback.conversation_status === 'Ожидает ответа' && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Ожидает ответа
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{callback.message}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(callback.created_at)}
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {callback.conversation_count} сообщений
                        </span>
                        {callback.last_message_at && (
                          <span>
                            Последнее: {formatDate(callback.last_message_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    {callback.conversation_count > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCallback(callback)
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Переписка
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {!isExpanded && callbacks.length > 3 && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => setIsExpanded(true)}>
                    Показать все ({callbacks.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно переписки */}
      {selectedCallback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Переписка по обращению</h2>
                  <p className="text-blue-100">{selectedCallback.name}</p>
                </div>
                <button
                  onClick={() => setSelectedCallback(null)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Переписка */}
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold">Сообщения</h3>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {conversations.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_type === 'admin'
                            ? 'bg-blue-500 text-white'
                            : message.sender_type === 'system'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatDate(message.created_at)}
                          {message.admin_name && ` • ${message.admin_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Форма отправки сообщения */}
              <div className="space-y-3 pt-4 border-t">
                <Label htmlFor="message">Отправить сообщение</Label>
                <Textarea
                  id="message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите ваше сообщение..."
                  rows={3}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Отправить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast.Provider>
        {toast && (
          <Toast.Root
            className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
            open={!!toast}
            onOpenChange={() => setToast(null)}
          >
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <Toast.Title className="font-semibold">{toast.title}</Toast.Title>
                <Toast.Description className="text-sm text-gray-600">
                  {toast.description}
                </Toast.Description>
              </div>
            </div>
          </Toast.Root>
        )}
      </Toast.Provider>
    </>
  )
}
