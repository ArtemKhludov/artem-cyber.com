import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckoutContent } from '@/components/checkout/CheckoutContent'
import { PageLayout } from '@/components/layout/PageLayout'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface CheckoutPageProps {
  params: Promise<{ id: string }>
}

async function CheckoutPageContent({ params }: CheckoutPageProps) {
  const { id } = await params
  
  // Fetch the document by ID
  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !document) {
    notFound()
  }

  return <CheckoutContent document={document} />
}

export async function generateMetadata({ params }: CheckoutPageProps) {
  const { id } = await params
  
  const { data: document } = await supabase
    .from('documents')
    .select('title')
    .eq('id', id)
    .single()

  return {
    title: document ? `Checkout: ${document.title} - EnergyLogic` : 'Checkout - EnergyLogic',
    description: 'Secure payment for EnergyLogic documents via Stripe or Cryptomus',
  }
}

export default function CheckoutPage(props: CheckoutPageProps) {
  return (
    <PageLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }>
        <CheckoutPageContent {...props} />
      </Suspense>
    </PageLayout>
  )
}
