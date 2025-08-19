// Server-side PostHog client (only import on server)
let serverPostHog: any = null

export const getServerPostHog = () => {
  if (!serverPostHog && typeof window === 'undefined') {
    const { PostHog } = require('posthog-node')
    serverPostHog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    })
  }
  return serverPostHog
}

// Client-side PostHog initialization function
export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    const { default: posthog } = require('posthog-js')
    
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      loaded: (posthog: any) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      },
    })
    
    return posthog
  }
}

// Default export for server-side usage
export const posthog = {
  capture: (...args: any[]) => {
    const serverPH = getServerPostHog()
    if (serverPH) {
      return serverPH.capture(...args)
    }
  },
  identify: (...args: any[]) => {
    const serverPH = getServerPostHog()
    if (serverPH) {
      return serverPH.identify(...args)
    }
  }
}
