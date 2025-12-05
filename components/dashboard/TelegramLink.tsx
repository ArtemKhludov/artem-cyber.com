'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, ExternalLink, Loader2, MessageSquare, Settings } from 'lucide-react'

interface TelegramStatus {
    isLinked: boolean
    telegramUsername?: string
    notifyEnabled: boolean
}

export function TelegramLink() {
    const [status, setStatus] = useState<TelegramStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [linking, setLinking] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchStatus = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/user/telegram/link', {
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to get Telegram status')
            }

            const data = await response.json()
            setStatus(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleLink = async () => {
        try {
            setLinking(true)
            setError(null)

            const response = await fetch('/api/user/telegram/link', {
                method: 'POST',
                credentials: 'include'
            })

            if (!response.ok) {
                const body = await response.json()
                throw new Error(body.error || 'Failed to create linking link')
            }

            const data = await response.json()

            // Open Telegram with deep-link
            window.open(data.deepLink, '_blank')

            // Update status after 3 seconds
            setTimeout(() => {
                fetchStatus()
            }, 3000)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLinking(false)
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Telegram Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
                        Telegram Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchStatus}
                            className="ml-auto"
                        >
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Telegram Notifications
                </CardTitle>
                <CardDescription>
                    Get instant notifications about new replies to your requests
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {status?.isLinked ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-green-700 font-medium">Telegram account linked</span>
                        </div>

                        {status.telegramUsername && (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">@{status.telegramUsername}</Badge>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                Notifications: {status.notifyEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Tip:</strong> To disable notifications, send the bot the /unlink command
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <span className="text-amber-700 font-medium">Telegram account not linked</span>
                        </div>

                        <p className="text-sm text-gray-600">
                            Link your Telegram account to receive instant notifications about new replies to your support requests.
                        </p>

                        <Button
                            onClick={handleLink}
                            disabled={linking}
                            className="w-full"
                        >
                            {linking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating link...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Connect Telegram
                                </>
                            )}
                        </Button>

                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600">
                                <strong>How it works:</strong><br />
                                1. Click &quot;Connect Telegram&quot;<br />
                                2. Telegram will open with a link to the bot<br />
                                3. Click &quot;Start&quot; in the bot<br />
                                4. Done! You will receive notifications
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
