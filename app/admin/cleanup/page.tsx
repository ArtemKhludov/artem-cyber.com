'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/PageLayout'

export default function CleanupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)

  const checkStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cleanup-duplicates')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error checking status:', error)
    } finally {
      setLoading(false)
    }
  }

  const runCleanup = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cleanup-duplicates', {
        method: 'POST'
      })
      const data = await response.json()
      setResult(data)

      // Refresh status after cleanup
      await checkStatus()
    } catch (error) {
      console.error('Error running cleanup:', error)
      setResult({ error: 'Cleanup failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Admin Panel - Duplicate Cleanup</h1>

        <div className="space-y-6">
          {/* Status check */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Current database state</h2>
            <Button
              onClick={checkStatus}
              disabled={loading}
              className="mb-4"
            >
              {loading ? 'Checking...' : 'Check status'}
            </Button>

            {status && (
              <div className="bg-gray-50 rounded p-4">
                <p><strong>Total documents:</strong> {status.totalDocuments}</p>
                <p><strong>Unique titles:</strong> {status.uniqueTitles}</p>
                <p><strong>Has duplicates:</strong> {status.hasDuplicates ? '❌ Yes' : '✅ No'}</p>

                {status.duplicates && status.duplicates.length > 0 && (
                  <div className="mt-4">
                    <p><strong>Duplicates:</strong></p>
                    <ul className="list-disc list-inside mt-2">
                      {status.duplicates.map((dup: any, index: number) => (
                        <li key={index}>
                          {dup.title} ({dup.count} copies)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cleanup */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Duplicate cleanup</h2>
            <Button
              onClick={runCleanup}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 mb-4"
            >
              {loading ? 'Removing duplicates...' : 'Remove duplicates'}
            </Button>

            {result && (
              <div className={`rounded p-4 ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                {result.error ? (
                  <p><strong>Error:</strong> {result.error}</p>
                ) : (
                  <div>
                    <p><strong>{result.message}</strong></p>
                    {result.report && result.report.length > 0 && (
                      <div className="mt-4">
                        <p><strong>Details:</strong></p>
                        <ul className="list-disc list-inside mt-2 text-sm">
                          {result.report.map((item: any, index: number) => (
                            <li key={index}>
                              {item.title}: kept 1 copy out of {item.totalCopies}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Quick links</h2>
            <div className="space-x-4">
              <Button
                onClick={() => window.open('http://localhost:3000', '_blank')}
                variant="outline"
              >
                Home page
              </Button>
              <Button
                onClick={() => window.open('http://localhost:3000/catalog', '_blank')}
                variant="outline"
              >
                Catalog
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Refresh page
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
