import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe instance
export const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  })
}

// For backwards compatibility
export const stripe = {
  paymentIntents: {
    create: (params: any, options?: any) => getStripeInstance().paymentIntents.create(params, options),
    retrieve: (id: string, options?: any) => getStripeInstance().paymentIntents.retrieve(id, options),
    confirm: (id: string, params?: any, options?: any) => getStripeInstance().paymentIntents.confirm(id, params, options),
  }
}

// Client-side Stripe instance
export const getStripe = () => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
}
