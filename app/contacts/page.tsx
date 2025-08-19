import { ContactsPageContent } from '@/components/contacts/ContactsPageContent'
import { PageLayout } from '@/components/layout/PageLayout'

export const metadata = {
  title: 'Контакты - EnergyLogic',
  description: 'Свяжитесь с командой EnergyLogic. Телефон, email, адрес офиса и форма обратной связи',
}

export default function ContactsPage() {
  return (
    <PageLayout>
      <ContactsPageContent />
    </PageLayout>
  )
}
