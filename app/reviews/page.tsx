import { ReviewsPageContent } from '@/components/reviews/ReviewsPageContent'
import { PageLayout } from '@/components/layout/PageLayout'

export const metadata = {
  title: 'Отзывы клиентов - EnergyLogic',
  description: 'Читайте реальные отзывы наших клиентов о сессиях и программах EnergyLogic',
}

export default function ReviewsPage() {
  return (
    <PageLayout>
      <ReviewsPageContent />
    </PageLayout>
  )
}
