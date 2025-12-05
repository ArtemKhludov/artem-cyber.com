'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock, 
  User, 
  Send, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface CallbackRequest {
  id: string
  name: string
  phone: string
  email: string
  message: string
  preferred_time: string
  source_page: string
  product_type: string
  product_name: string
  status: string
  created_at: string
  last_contacted_at: string
  user_id: string
  auto_created_user: boolean
  issue_id: string
}

interface CallbackReply {
  id: string
  callback_request_id: string
  user_id: string
  admin_id: string
  message: string
  is_from_admin: boolean
  created_at: string
  read_by: string[]
  admin?: {
    id: string
    name: string
    email: string
  }
}

interface UserCallbacksWithRepliesProps {
  userId: string
}

export function UserCallbacksWithReplies({ userId }: UserCallbacksWithRepliesProps) {
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([])
  const [replies, setReplies] = useState<Record<string, CallbackReply[]>>({})
  const [expandedCallbacks, setExpandedCallbacks] = useState<Set<string>>(new Set())
  const [newReplies, setNewReplies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchCallbacks()
  }, [userId])

  const fetchCallbacks = async () => {
    try {
      const response = await fetch('/api/user/callbacks')
      if (response.ok) {
        const data = await response.json()
        setCallbacks(data.data || [])
        
        // Load replies for each request
        for (const callback of data.data || []) {
          await fetchReplies(callback.id)
        }
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async (callbackId: string) => {
    try {
      const response = await fetch(`/api/user/callbacks/${callbackId}/replies`)
      if (response.ok) {
        const data = await response.json()
        setReplies(prev => ({
          ...prev,
          [callbackId]: data.data || []
        }))
      }
    } catch (error) {
      console.error('Error fetching replies:', error)
    }
  }

  const toggleExpanded = (callbackId: string) => {
    const newExpanded = new Set(expandedCallbacks)
    if (newExpanded.has(callbackId)) {
      newExpanded.delete(callbackId)
    } else {
      newExpanded.add(callbackId)
    }
    setExpandedCallbacks(newExpanded)
  }

  const handleReplySubmit = async (callbackId: string) => {
    const message = newReplies[callbackId]?.trim()
    if (!message) return

    setSubmitting(prev => ({ ...prev, [callbackId]: true }))

    try {
      const response = await fetch(`/api/user/callbacks/${callbackId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (response.ok) {
        setNewReplies(prev => ({ ...prev, [callbackId]: '' }))
        await fetchReplies(callbackId) // Refresh replies
      } else {
        const error = await response.json()
        console.error('Error submitting reply:', error)
      }
    } catch (error) {
      console.error('Error submitting reply:', error)
    } finally {
      setSubmitting(prev => ({ ...prev, [callbackId]: false }))
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { label: 'New', variant: 'default' as const, icon: AlertCircle },
      replied: { label: 'Replied', variant: 'secondary' as const, icon: CheckCircle },
      waiting_response: { label: 'Waiting for Reply', variant: 'outline' as const, icon: Clock },
      closed: { label: 'Closed', variant: 'destructive' as const, icon: CheckCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            My Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading requests...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (callbacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            My Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests yet</h3>
        <p className="text-gray-600">
          When you submit a request through the website form, it will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          My Requests ({callbacks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {callbacks.map((callback) => {
          const isExpanded = expandedCallbacks.has(callback.id)
          const callbackReplies = replies[callback.id] || []
          const unreadReplies = callbackReplies.filter(reply => 
            reply.is_from_admin && !reply.read_by?.includes(userId)
          )

          return (
            <div key={callback.id} className="border rounded-lg p-4 space-y-4">
              {/* Request header */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpanded(callback.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-semibold">
                      {callback.product_name || 'Callback request'}
                    </span>
                  </div>
                  {getStatusBadge(callback.status)}
                  {unreadReplies.length > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {unreadReplies.length} new
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(callback.created_at)}
                </div>
              </div>

              {/* Request details */}
              {isExpanded && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                  {/* Request info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Name:</span>
                      <span>{callback.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Phone:</span>
                      <span>{callback.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Email:</span>
                      <span>{callback.email}</span>
                    </div>
                    {callback.preferred_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Convenient time:</span>
                        <span>{callback.preferred_time}</span>
                      </div>
                    )}
                  </div>

                  {callback.message && (
                    <div>
                      <span className="font-medium text-sm">Message:</span>
                      <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded-lg">
                        {callback.message}
                      </p>
                    </div>
                  )}

                  {/* Replies */}
                  {callbackReplies.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Conversation:</h4>
                      <div className="space-y-3">
                        {callbackReplies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`p-3 rounded-lg ${
                              reply.is_from_admin
                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                : 'bg-gray-50 border-l-4 border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {reply.is_from_admin 
                                    ? (reply.admin?.name || 'Admin')
                                    : 'You'
                                  }
                                </span>
                                {reply.is_from_admin && unreadReplies.some(r => r.id === reply.id) && (
                                  <Badge variant="destructive" className="text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply form */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Reply:</h4>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Enter your reply..."
                        value={newReplies[callback.id] || ''}
                        onChange={(e) => setNewReplies(prev => ({
                          ...prev,
                          [callback.id]: e.target.value
                        }))}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleReplySubmit(callback.id)}
                          disabled={!newReplies[callback.id]?.trim() || submitting[callback.id]}
                          size="sm"
                        >
                          {submitting[callback.id] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
