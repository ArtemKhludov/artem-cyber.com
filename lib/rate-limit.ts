interface AttemptState {
  failures: number
  windowStart: number
  blockedUntil?: number
  lastFailure?: number
  captchaTriggered?: boolean
}

export interface RateLimitOptions {
  windowMs: number
  maxAttempts: number
  blockDurationMs: number
  captchaThreshold: number
}

export interface RateLimitCheck {
  blocked: boolean
  blockedUntil?: number
  requiresCaptcha: boolean
}

export class RateLimiter {
  private attempts = new Map<string, AttemptState>()

  constructor(private options: RateLimitOptions) {}

  private getState(key: string, now: number) {
    const state = this.attempts.get(key)
    if (!state) {
      return undefined
    }

    if (now - state.windowStart > this.options.windowMs) {
      this.attempts.delete(key)
      return undefined
    }

    return state
  }

  check(key: string): RateLimitCheck {
    const now = Date.now()
    const state = this.getState(key, now)

    if (!state) {
      return { blocked: false, requiresCaptcha: false }
    }

    if (state.blockedUntil && state.blockedUntil > now) {
      return { blocked: true, blockedUntil: state.blockedUntil, requiresCaptcha: true }
    }

    const requiresCaptcha = state.captchaTriggered || state.failures >= this.options.captchaThreshold

    return { blocked: false, requiresCaptcha }
  }

  recordFailure(key: string) {
    const now = Date.now()
    const state = this.getState(key, now)

    if (!state) {
      this.attempts.set(key, {
        failures: 1,
        windowStart: now,
        lastFailure: now,
        captchaTriggered: this.options.captchaThreshold <= 1,
      })
      return
    }

    state.failures += 1
    state.lastFailure = now

    if (state.failures >= this.options.captchaThreshold) {
      state.captchaTriggered = true
    }

    if (state.failures >= this.options.maxAttempts) {
      state.blockedUntil = now + this.options.blockDurationMs
    }

    this.attempts.set(key, state)
  }

  recordSuccess(key: string) {
    this.attempts.delete(key)
  }

  cleanup() {
    const now = Date.now()
    for (const [key, state] of this.attempts) {
      if (state.blockedUntil && state.blockedUntil < now - this.options.windowMs) {
        this.attempts.delete(key)
        continue
      }
      if (now - state.windowStart > this.options.windowMs && (!state.blockedUntil || state.blockedUntil < now)) {
        this.attempts.delete(key)
      }
    }
  }
}

interface RateLimiterRegistry {
  [name: string]: RateLimiter
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimiterRegistry: RateLimiterRegistry | undefined
}

function getRegistry(): RateLimiterRegistry {
  if (!global.__rateLimiterRegistry) {
    global.__rateLimiterRegistry = {}
  }
  return global.__rateLimiterRegistry
}

export function getRateLimiter(name: string, options: RateLimitOptions) {
  const registry = getRegistry()
  if (!registry[name]) {
    registry[name] = new RateLimiter(options)
  }
  return registry[name]
}
