/* eslint-disable no-console */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const entry = {
      timestamp,
      level,
      message,
      ...context,
    }

    if (this.isDevelopment) {
      const method: 'log' | 'warn' | 'error' = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[method](JSON.stringify(entry, null, 2))
    } else {
      // TODO: send logs to external service (Sentry, Datadog, etc.)
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = error
      ? { error: error.message, stack: error.stack, ...context }
      : context
    this.log('error', message, errorContext)
  }

  debug(message: string, context?: LogContext) {
    if (!this.isDevelopment) return
    this.log('debug', message, context)
  }
}

export const logger = new Logger()

export function logInfo(message: string, context?: LogContext) {
  logger.info(message, context)
}

export function logWarn(message: string, context?: LogContext) {
  logger.warn(message, context)
}

export function logError(message: string, error?: Error, context?: LogContext) {
  logger.error(message, error, context)
}

export function logDebug(message: string, context?: LogContext) {
  logger.debug(message, context)
}
