'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'

function VerifyEmailContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    useEffect(() => {
        if (token) {
            verifyEmail(token)
        } else {
            setStatus('error')
            setMessage('Verification token not found')
        }
    }, [token])

    const verifyEmail = async (verificationToken: string) => {
        try {
            const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`)
            const data = await response.json()

            if (response.ok) {
                setStatus('success')
                setMessage(data.message)
            } else {
                setStatus('error')
                setMessage(data.error || 'Verification error')
            }
        } catch (error) {
            setStatus('error')
            setMessage('Network error')
        }
    }

    const handleContinue = () => {
        router.push('/auth/login')
    }

    return (
        <PageLayout>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center">
                            {status === 'loading' && (
                                <>
                                    <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                        Email Verification
                                    </h1>
                                    <p className="text-gray-600">
                                        Verifying your token...
                                    </p>
                                </>
                            )}

                            {status === 'success' && (
                                <>
                                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                        Email Verified!
                                    </h1>
                                    <p className="text-gray-600 mb-6">
                                        {message}
                                    </p>
                                    <Button
                                        onClick={handleContinue}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        Continue
                                    </Button>
                                </>
                            )}

                            {status === 'error' && (
                                <>
                                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                        Verification Error
                                    </h1>
                                    <p className="text-gray-600 mb-6">
                                        {message}
                                    </p>
                                    <Button
                                        onClick={handleContinue}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Back to Sign In
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <PageLayout>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                        <p className="text-gray-600">Loading...</p>
                    </div>
                </div>
            </PageLayout>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}
