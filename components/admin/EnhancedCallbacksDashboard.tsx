'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    Phone,
    User,
    Mail,
    Clock,
    MessageSquare,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCcw,
    Send,
    Tag,
    Filter,
    Search,
    UserPlus,
    MessageCircle,
    Calendar,
    TrendingUp
} from 'lucide-react'

interface CallbackReply {
    id: string
    message: string
    author_type: 'user' | 'admin' | 'system'
    author_email: string | null
    created_at: string
    is_internal: boolean
}

interface User {
    id: string
    email: string
    name: string
    phone: string | null
    telegram_username: string | null
    notify_email_enabled: boolean
    notify_telegram_enabled: boolean
}

interface IssueReport {
    id: string
    title: string
    status: string
    created_at: string
}

interface AssignedAdmin {
    id: string
    email: string
    name: string
}

interface CallbackRequest {
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
    auto_created_user: boolean
    user_credentials_sent: boolean
    users: User | null
    issue_reports: IssueReport | null
    callback_replies: CallbackReply[]
    assigned_admin: AssignedAdmin | null
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

export function EnhancedCallbacksDashboard() {
    const [callbacks, setCallbacks] = useState<CallbackRequest[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [assignedAdminFilter, setAssignedAdminFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    // Modals
    const [selectedCallback, setSelectedCallback] = useState<CallbackRequest | null>(null)
    const [replyDialogOpen, setReplyDialogOpen] = useState(false)
    const [newReply, setNewReply] = useState('')
    const [isInternalReply, setIsInternalReply] = useState(false)
    const [submittingReply, setSubmittingReply] = useState(false)

    const fetchCallbacks = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                status: statusFilter,
                priority: priorityFilter,
                assigned_admin: assignedAdminFilter,
                page: currentPage.toString(),
                limit: '20'
            })

            const response = await fetch(`/api/callback/enhanced?${params}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load requests')
            }

            setCallbacks(data.data)
            setPagination(data.pagination)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCallbacks()
    }, [statusFilter, priorityFilter, assignedAdminFilter, currentPage])

    const updateCallbackStatus = async (id: string, status: string) => {
        try {
            const response = await fetch('/api/callback/enhanced', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, status })
            })

            if (!response.ok) {
                throw new Error('Failed to update status')
            }

            // Update local state
            setCallbacks(prev => prev.map(callback =>
                callback.id === id ? { ...callback, status } : callback
            ))
        } catch (err) {
            console.error('Error updating status:', err)
        }
    }

    const handleReplySubmit = async () => {
        if (!selectedCallback || !newReply.trim()) return

        try {
            setSubmittingReply(true)
            const response = await fetch(`/api/callback/${selectedCallback.id}/replies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: newReply.trim(),
                    is_internal: isInternalReply
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reply')
            }

            setNewReply('')
            setIsInternalReply(false)
            setReplyDialogOpen(false)
            await fetchCallbacks()
        } catch (err) {
            console.error('Error submitting reply:', err)
        } finally {
            setSubmittingReply(false)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'new':
                return <AlertCircle className="w-4 h-4 text-orange-500" />
            case 'contacted':
                return <Phone className="w-4 h-4 text-blue-500" />
            case 'in_progress':
                return <Clock className="w-4 h-4 text-yellow-500" />
            case 'waiting_admin':
                return <MessageSquare className="w-4 h-4 text-purple-500" />
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-500" />
            default:
                return <AlertCircle className="w-4 h-4 text-gray-500" />
        }
    }

    const getStatusText = (status: string) => {
        const statusLabels: Record<string, string> = {
            'new': 'New',
            'contacted': 'Contacted',
            'in_progress': 'In progress',
            'waiting_admin': 'Waiting reply',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        }
        return statusLabels[status] || status
    }

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            'low': 'bg-gray-100 text-gray-700',
            'medium': 'bg-blue-100 text-blue-700',
            'high': 'bg-orange-100 text-orange-700',
            'urgent': 'bg-red-100 text-red-700'
        }
        return colors[priority] || 'bg-gray-100 text-gray-700'
    }

    const getPriorityText = (priority: string) => {
        const labels: Record<string, string> = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'urgent': 'Urgent'
        }
        return labels[priority] || priority
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US')
    }

    const filteredCallbacks = callbacks.filter(callback => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            callback.name.toLowerCase().includes(query) ||
            callback.phone.includes(query) ||
            callback.email?.toLowerCase().includes(query) ||
            callback.message?.toLowerCase().includes(query) ||
            callback.product_name.toLowerCase().includes(query)
        )
    })

    if (loading && callbacks.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading requests...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Advanced requests dashboard
                    </h1>
                    <p className="text-gray-600">
                        Manage requests with full user and ticket integration
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <AlertCircle className="h-8 w-8 text-orange-500" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">New</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {callbacks.filter(c => c.status === 'new').length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <Clock className="h-8 w-8 text-blue-500" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">In progress</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {callbacks.filter(c => c.status === 'in_progress').length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <UserPlus className="h-8 w-8 text-green-500" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Auto-created users</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {callbacks.filter(c => c.auto_created_user).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <MessageCircle className="h-8 w-8 text-purple-500" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">With replies</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {callbacks.filter(c => c.callback_replies.length > 0).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="search"
                                        placeholder="Search requests..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="waiting_admin">Waiting reply</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="priority">Priority</Label>
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">All priorities</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="assigned">Assigned to</Label>
                                <select
                                    value={assignedAdminFilter}
                                    onChange={(e) => setAssignedAdminFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">All admins</option>
                                    <option value="unassigned">Unassigned</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button onClick={fetchCallbacks} disabled={loading} className="w-full">
                                    <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Callbacks List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Requests ({filteredCallbacks.length})</CardTitle>
                        <CardDescription>
                            Full list of requests with user integration
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredCallbacks.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">No requests found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredCallbacks.map((callback) => (
                                    <div key={callback.id} className="border rounded-lg p-6 space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {callback.product_name}
                                                    </h3>
                                                    <Badge className={getPriorityColor(callback.priority)}>
                                                        {getPriorityText(callback.priority)}
                                                    </Badge>
                                                    {callback.auto_created_user && (
                                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                                            <UserPlus className="w-3 h-3 mr-1" />
                                                            Auto-created user
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 mb-2">
                                                    {callback.message || 'Callback request'}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        {callback.name}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-4 h-4" />
                                                        {callback.phone}
                                                    </span>
                                                    {callback.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-4 h-4" />
                                                            {callback.email}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(callback.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 ml-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(callback.status)}
                                                    <span className="text-sm font-medium">
                                                        {getStatusText(callback.status)}
                                                    </span>
                                                </div>
                                                {callback.assigned_admin && (
                                                    <Badge variant="outline">
                                                        {callback.assigned_admin.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* User Info */}
                                        {callback.users && (
                                            <div className="bg-blue-50 rounded-lg p-4">
                                                <h4 className="font-medium text-blue-900 mb-2">User info:</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium">Email:</span> {callback.users.email}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Telegram:</span> {callback.users.telegram_username || 'Not connected'}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Notifications:</span>
                                                        {callback.users.notify_email_enabled && ' Email'}
                                                        {callback.users.notify_telegram_enabled && ' Telegram'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {callback.tags && callback.tags.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-gray-400" />
                                                <div className="flex gap-1">
                                                    {callback.tags.map((tag, index) => (
                                                        <Badge key={index} variant="outline" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Replies */}
                                        {callback.callback_replies && callback.callback_replies.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-gray-900">Conversation ({callback.callback_replies.length}):</h4>
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {callback.callback_replies.map((reply) => (
                                                        <div key={reply.id} className={`rounded-lg p-3 ${reply.author_type === 'admin'
                                                            ? 'bg-blue-50 border-l-4 border-blue-400'
                                                            : 'bg-gray-50 border-l-4 border-gray-400'
                                                            }`}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-medium">
                                                                    {reply.author_type === 'admin' ? 'Support' : 'User'}
                                                                </span>
                                                                <span className="text-xs text-gray-600">
                                                                    {formatDate(reply.created_at)}
                                                                </span>
                                                                {reply.is_internal && (
                                                                    <Badge variant="outline" className="text-xs">Internal</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm">{reply.message}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedCallback(callback)
                                                    setReplyDialogOpen(true)
                                                }}
                                            >
                                                <MessageSquare className="w-4 h-4 mr-1" />
                                                Reply
                                            </Button>
                                            {callback.status === 'new' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateCallbackStatus(callback.id, 'contacted')}
                                                    >
                                                        <Phone className="w-4 h-4 mr-1" />
                                                        Contacted
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateCallbackStatus(callback.id, 'in_progress')}
                                                    >
                                                        <Clock className="w-4 h-4 mr-1" />
                                                        Start work
                                                    </Button>
                                                </>
                                            )}
                                            {callback.status === 'in_progress' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateCallbackStatus(callback.id, 'completed')}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Complete
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(`tel:${callback.phone}`)}
                                            >
                                                <Phone className="w-4 h-4" />
                                            </Button>
                                            {callback.users && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(`/admin/users/${callback.users?.id}`, '_blank')}
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Profile
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                disabled={pagination.page === 1}
                                onClick={() => setCurrentPage(pagination.page - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setCurrentPage(pagination.page + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Reply Dialog */}
                <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Reply to request</DialogTitle>
                            <DialogDescription>
                                {selectedCallback && `Request from ${selectedCallback.name} (${selectedCallback.phone})`}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="reply">Message</Label>
                                <Textarea
                                    id="reply"
                                    value={newReply}
                                    onChange={(e) => setNewReply(e.target.value)}
                                    placeholder="Enter your reply..."
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="internal"
                                    checked={isInternalReply}
                                    onChange={(e) => setIsInternalReply(e.target.checked)}
                                    className="rounded"
                                />
                                <Label htmlFor="internal" className="text-sm">
                                    Internal note (not visible to user)
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReplySubmit}
                                disabled={submittingReply || !newReply.trim()}
                            >
                                {submittingReply ? (
                                    <>
                                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
