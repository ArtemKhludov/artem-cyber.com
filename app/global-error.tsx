'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ShoppingBag, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
          <div className="text-center px-4 max-w-2xl mx-auto">
            <div className="text-6xl mb-6">💥</div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-blue-200 mb-8 text-lg">
              Our engineers have been notified and are already fixing the issue
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={reset}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Back home
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link href="/catalog">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Browse catalog
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
