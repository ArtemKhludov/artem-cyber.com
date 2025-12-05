'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'
import type { Document } from '@/types'

interface StripePaymentProps {
  document: Document
  userEmail?: string
  userCountry?: string
  userIP?: string
}

export function StripePayment({ document, userEmail, userCountry, userIP }: StripePaymentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStripePayment = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Create checkout session on the backend
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          amount: document.price_rub,
          currency: 'rub',
          userEmail,
          userCountry,
          userIP,
          successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/checkout/${document.id}?canceled=true`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { sessionUrl } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl
    } catch (error) {
      console.error('Stripe payment error:', error)
      setError(error instanceof Error ? error.message : 'Payment error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <Button
        onClick={handleStripePayment}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pay {document.price_rub.toLocaleString('en-US')} ₽
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-xs text-gray-500 mb-2">
          By paying, you agree to our{' '}
          <Link href="/refund" className="text-blue-600 hover:underline font-medium">
            Refund Policy
          </Link>
        </p>
        <p className="text-xs text-gray-500">
          Secure payment via Stripe
        </p>
        <div className="flex items-center justify-center mt-2 space-x-2">
          <img src="/stripe-badge.png" alt="Stripe" className="h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">256-bit SSL encryption</span>
        </div>
      </div>
    </div>
  )
}
