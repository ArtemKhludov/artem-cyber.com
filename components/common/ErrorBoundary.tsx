'use client'

import React from 'react'

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error?: Error | null
  info?: { componentStack: string } | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, info: null }
  }

  async componentDidCatch(error: Error, info: React.ErrorInfo) {
    const componentStack = info.componentStack ?? ''
    this.setState({ info: { componentStack } })
    try {
      await fetch('/api/observability/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: { message: error.message, name: error.name, stack: error.stack },
          info: { componentStack },
          location: typeof window !== 'undefined' ? window.location.pathname : '',
        })
      })
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Произошла ошибка. Попробуйте обновить страницу.
          </div>
          <button
            type="button"
            className="mt-3 rounded-md border px-3 py-2 text-sm"
            onClick={() => (typeof window !== 'undefined' ? window.location.reload() : undefined)}
          >
            Обновить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

