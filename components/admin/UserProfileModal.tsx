'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MessageSquare, 
  Send, 
  Clock, 
  AlertCircle,
  CheckCircle,
  FileText,
  Tag,
  Star
} from 'lucide-react'
import * as Toast from '@radix-ui/react-toast'

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: string
  created_at: string
  last_activity?: string
}

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
  priority: string
  tags: string[]
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

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export function UserProfileModal({ isOpen, onClose, userId }: UserProfileModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([])
  const [selectedCallback, setSelectedCallback] = useState<CallbackRequest | null>(null)
  const [conversations, setConversations] = useState<ConversationMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<{ title: string; description: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData()
    }
  }, [isOpen, userId])

  useEffect(() => {
    if (selectedCallback) {
      fetchConversations(selectedCallback.id)
    }
  }, [selectedCallback])

  const fetchUserData = async () => {
    setIsLoading(true)
    try {
      // Get user data
      const userResponse = await fetch(`/api/users/${userId}`)
      const userResult = await userResponse.json()
      
      if (userResult.success) {
        setUser(userResult.data)
      }

      // Get user requests
      const callbacksResponse = await fetch(`/api/admin/callbacks?user_id=${userId}`)
      const callbacksResult = await callbacksResponse.json()
      
      if (callbacksResult.success) {
        setCallbacks(callbacksResult.data)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setToast({
        title: 'Error',
        description: 'Failed to load user data',
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
        setToast({
          title: 'Success',
          description: 'Message sent',
          type: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setToast({
        title: 'Error',
        description: 'Failed to send message',
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US')
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user?.name || 'Loading...'}</h2>
                  <p className="text-blue-100">User Profile</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="callbacks">Requests ({callbacks.length})</TabsTrigger>
                  <TabsTrigger value="conversation">Conversation</TabsTrigger>
                </TabsList>

                {/* User Profile */}
                <TabsContent value="profile" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        User Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Phone className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{user?.phone || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Registration Date</p>
                            <p className="font-medium">{user?.created_at ? formatDate(user.created_at) : 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Star className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Role</p>
                            <Badge variant="secondary">{user?.role || 'user'}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{callbacks.length}</div>
                          <div className="text-sm text-gray-600">Total Requests</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {callbacks.filter(c => c.status === 'completed').length}
                          </div>
                          <div className="text-sm text-gray-600">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {callbacks.filter(c => c.status === 'new').length}
                          </div>
                          <div className="text-sm text-gray-600">New</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Requests List */}
                <TabsContent value="callbacks" className="space-y-4">
                  {callbacks.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">User has no requests yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {callbacks.map((callback) => (
                        <Card 
                          key={callback.id} 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedCallback?.id === callback.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setSelectedCallback(callback)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold">{callback.name}</h3>
                                  <Badge className={getStatusColor(callback.status)}>
                                    {callback.status}
                                  </Badge>
                                  <Badge className={getPriorityColor(callback.priority)}>
                                    {callback.priority}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-sm mb-2">{callback.message}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatDate(callback.created_at)}
                                  </span>
                                  <span className="flex items-center">
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    {callback.conversation_count} messages
                                  </span>
                                  <span className={callback.conversation_status === 'Waiting for response' ? 'text-orange-600' : 'text-green-600'}>
                                    {callback.conversation_status}
                                  </span>
                                </div>
                              </div>
                              {callback.tags && callback.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {callback.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      <Tag className="w-3 h-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Conversation */}
                <TabsContent value="conversation" className="space-y-4">
                  {!selectedCallback ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Select a request to view conversation</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Request Header */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{selectedCallback.name}</h3>
                              <p className="text-sm text-gray-600">{selectedCallback.message}</p>
                            </div>
                            <Badge className={getStatusColor(selectedCallback.status)}>
                              {selectedCallback.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Conversation */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Conversation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="max-h-96 overflow-y-auto space-y-3">
                            {conversations.map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
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

                          {/* Message Form */}
                          <div className="space-y-3 pt-4 border-t">
                            <Label htmlFor="message">Send Message</Label>
                            <Textarea
                              id="message"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Enter your message..."
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
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

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
