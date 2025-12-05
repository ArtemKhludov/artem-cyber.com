'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, MessageSquare, RefreshCcw } from 'lucide-react'

interface IssueReply {
    id: string
    message: string
    author_email: string | null
    created_at: string
}

interface Issue {
    id: string
    title: string
    description: string
    type: string
    severity: string
    status: string
    created_at: string
    updated_at: string
    first_reply_at: string | null
    closed_at: string | null
    issue_replies: IssueReply[]
}

const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    waiting_user: 'bg-orange-100 text-orange-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700'
}

const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_user: 'Waiting for Reply',
    resolved: 'Resolved',
    closed: 'Closed'
}

const TYPE_LABELS: Record<string, string> = {
    access: 'Access',
    payment: 'Payment',
    content: 'Content',
    bug: 'Bug',
    other: 'Other'
}

export function UserIssuesList() {
    const [issues, setIssues] = useState<Issue[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchIssues = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/user/issues', {
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to load issues')
            }

            const data = await response.json()
            setIssues(data.issues || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIssues()
    }, [])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        My Issues
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

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        My Issues
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <span className="ml-2 text-red-600">{error}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchIssues}
                            className="ml-4"
                        >
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (issues.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        My Issues
                    </CardTitle>
                    <CardDescription>
                        Your support requests and replies will be displayed here
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>You don&apos;t have any support requests yet</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        My Issues
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchIssues}
                        className="flex items-center gap-2"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                </CardTitle>
                <CardDescription>
                    History of your support requests and replies
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {issues.map((issue) => (
                        <div key={issue.id} className="border rounded-lg p-4 space-y-3">
                            {/* Issue Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">{issue.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <Badge className={STATUS_COLORS[issue.status] || 'bg-gray-100 text-gray-700'}>
                                        {STATUS_LABELS[issue.status] || issue.status}
                                    </Badge>
                                    <Badge variant="outline">
                                        {TYPE_LABELS[issue.type] || issue.type}
                                    </Badge>
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Created: {formatDate(issue.created_at)}
                                </span>
                                {issue.first_reply_at && (
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        Reply: {formatDate(issue.first_reply_at)}
                                    </span>
                                )}
                            </div>

                            {/* Replies */}
                            {issue.issue_replies && issue.issue_replies.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-gray-700">Support Replies:</h4>
                                    {issue.issue_replies.map((reply) => (
                                        <div key={reply.id} className="bg-blue-50 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-blue-900">
                                                    {reply.author_email || 'Support'}
                                                </span>
                                                <span className="text-xs text-blue-600">
                                                    {formatDate(reply.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-blue-800">{reply.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
