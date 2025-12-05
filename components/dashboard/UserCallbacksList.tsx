'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Clock, MessageSquare, RefreshCcw, Send, Phone, Mail, Tag } from 'lucide-react'

interface CallbackReply {
    id: string
    message: string
    author_type: 'user' | 'admin' | 'system'
    author_email: string | null
    created_at: string
    is_internal: boolean
}

interface UserCallback {
    id: string
    name: string
    phone: string
    email: string | null
    preferred_time: string | null
    message: string | null
    source_page: string
    product_type: string
    product_name: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    last_contacted_at: string | null
    contact_attempts: number
    admin_notes: string | null
    tags: string[]
    metadata: any
    callback_replies: CallbackReply[]
    issue_reports?: {
        id: string
        title: string
        status: string
        created_at: string
    }[]
}

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-orange-100 text-orange-700',
    waiting_admin: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
}

const STATUS_LABELS: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    in_progress: 'In Progress',
    waiting_admin: 'Waiting for Reply',
    completed: 'Completed',
    cancelled: 'Cancelled'
}

const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
}

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
}

export function UserCallbacksList() {
    const [callbacks, setCallbacks] = useState<UserCallback[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [newPriority, setNewPriority] = useState('medium')
    const [submitting, setSubmitting] = useState(false)
    const [expandedCallback, setExpandedCallback] = useState<string | null>(null)

    const fetchCallbacks = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/user/callbacks', {
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to load requests')
            }

            const data = await response.json()
            setCallbacks(data.callbacks || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCallbacks()
    }, [])

    const handleCreateCallback = async () => {
        if (!newMessage.trim() || newMessage.trim().length < 10) {
            setError('Message must contain at least 10 characters')
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const response = await fetch('/api/user/callbacks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    message: newMessage.trim(),
                    priority: newPriority
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error creating request')
            }

            setNewMessage('')
            setNewPriority('medium')
            await fetchCallbacks()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setSubmitting(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getSourceLabel = (source: string) => {
        const sources: Record<string, string> = {
  'dashboard': 'Dashboard',
  'website': 'Website',
  'catalog': 'Catalog',
  'contacts': 'Contacts',
  'unknown': 'Unknown'
        }
        return sources[source] || source
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        My Requests
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <RefreshCcw className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-600">Loading...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* New Request Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Create New Request
                    </CardTitle>
                    <CardDescription>
                        Describe your problem or question, and we will contact you
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Priority
                        </label>
                        <select
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Message *
                        </label>
                        <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Describe your problem or question in detail..."
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-xs text-gray-500">
                            Minimum 10 characters. Remaining: {Math.max(0, 10 - newMessage.length)}
                        </p>
                    </div>

                    <Button
                        onClick={handleCreateCallback}
                        disabled={submitting || newMessage.trim().length < 10}
                        className="w-full"
                    >
                        {submitting ? (
                            <>
                                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                                Creating request...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Create request
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Requests list */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            My Requests ({callbacks.length})
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchCallbacks}
                            className="flex items-center gap-2"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Your request history and support conversations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {callbacks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>You have no requests yet</p>
                            <p className="text-sm">Create your first request above</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {callbacks.map((callback) => (
                                <div key={callback.id} className="border rounded-lg p-4 space-y-3">
                                    {/* Request header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">
                                                {callback.product_name}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {callback.message || 'Callback request'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-500">
                                                    {getSourceLabel(callback.source_page)}
                                                </span>
                                                {callback.preferred_time && (
                                                    <>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500">
                                                            <Clock className="h-3 w-3 inline mr-1" />
                                                            {callback.preferred_time}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 ml-4">
                                            <Badge className={STATUS_COLORS[callback.status] || 'bg-gray-100 text-gray-700'}>
                                                {STATUS_LABELS[callback.status] || callback.status}
                                            </Badge>
                                            <Badge className={PRIORITY_COLORS[callback.priority] || 'bg-gray-100 text-gray-700'}>
                                                {PRIORITY_LABELS[callback.priority] || callback.priority}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Created: {formatDate(callback.created_at)}
                                        </span>
                                        {callback.last_contacted_at && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                Contacted: {formatDate(callback.last_contacted_at)}
                                            </span>
                                        )}
                                        {callback.contact_attempts > 0 && (
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                Attempts: {callback.contact_attempts}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {callback.tags && callback.tags.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-3 w-3 text-gray-400" />
                                            <div className="flex gap-1">
                                                {callback.tags.map((tag, index) => (
                                                    <Badge key={index} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Linked support ticket */}
                                    {callback.issue_reports && callback.issue_reports.length > 0 && (
                                        <div className="bg-blue-50 rounded-lg p-3">
                                            <p className="text-sm font-medium text-blue-900 mb-1">
                                                Linked support ticket:
                                            </p>
                                            <p className="text-sm text-blue-800">
                                                {callback.issue_reports[0].title}
                                            </p>
                                        </div>
                                    )}

                                    {/* Replies */}
                                    {callback.callback_replies && callback.callback_replies.length > 0 && (
                                        <div className="space-y-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedCallback(
                                                    expandedCallback === callback.id ? null : callback.id
                                                )}
                                                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                                            >
                                                {expandedCallback === callback.id ? 'Hide' : 'Show'} replies ({callback.callback_replies.length})
                                            </Button>

                                            {expandedCallback === callback.id && (
                                                <div className="space-y-2">
                                                    {callback.callback_replies.map((reply) => (
                                                        <div key={reply.id} className={`rounded-lg p-3 ${reply.author_type === 'admin'
                                                            ? 'bg-blue-50 border-l-4 border-blue-400'
                                                            : 'bg-gray-50 border-l-4 border-gray-400'
                                                            }`}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-sm font-medium">
                                                                    {reply.author_type === 'admin' ? 'Support' : 'You'}
                                                                </span>
                                                                <span className="text-xs text-gray-600">
                                                                    {formatDate(reply.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm">{reply.message}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
