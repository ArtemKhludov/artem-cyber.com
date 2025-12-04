import { PageLayout } from '@/components/layout/PageLayout'

export default function PrivacyPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 text-lg mb-8">
            Last Updated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. General Provisions</h2>
          <p className="text-gray-700 mb-4">
            This Privacy Policy describes how we - the EnergyLogic project team operating from Los Angeles, California, USA - collect, use, and store your personal data.
          </p>
          <p className="text-gray-700 mb-4">
            At the time of publication of this document, no legal entity has been registered; however, we strictly adhere to the principles of:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>EU General Data Protection Regulation (GDPR);</li>
            <li>California Consumer Privacy Act (CCPA);</li>
            <li>General principles of fair handling of personal data.</li>
          </ul>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. What Data We Collect</h2>
          <p className="text-gray-700 mb-4">
            We collect only the data that you consciously and voluntarily provide when:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Taking tests and surveys;</li>
            <li>Submitting a callback request;</li>
            <li>Interacting with our Telegram bot @energylogic_callback_bot;</li>
            <li>Visiting the site and using its features.</li>
          </ul>
          <p className="text-gray-700 mb-4">
            May include:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Name, phone number, email (when entered in forms);</li>
            <li>Answers to diagnostic tests;</li>
            <li>IP address, browser type, session information (anonymously, via Google Analytics or Posthog);</li>
            <li>Technical metadata from Supabase, OpenAI, and Telegram API.</li>
          </ul>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Data</h2>
          <p className="text-gray-700 mb-4">
            Your data is processed solely for the purpose of:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Selecting personalized materials (PDF documents, programs, videos);</li>
            <li>Sending test results;</li>
            <li>Contact communication at your request;</li>
            <li>Improving the accuracy of our analytics and service quality.</li>
          </ul>
          <p className="text-gray-700 mb-6">
            We do not sell, exchange, or transfer your data to third parties outside the scope of the services we use (Supabase, OpenAI, Telegram, Google).
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Storage and Protection</h2>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>All data is stored in Supabase (a platform with server-side access control and encryption);</li>
            <li>Requests to OpenAI (GPT) occur only after user consent;</li>
            <li>Telegram requests come only to a closed channel accessible only to the administrator;</li>
            <li>Data is deleted upon your written request or automatically after 12 months of inactivity.</li>
          </ul>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
          <p className="text-gray-700 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Receive a copy of all data we store about you;</li>
            <li>Modify or delete it;</li>
            <li>Prohibit further processing.</li>
          </ul>
          <p className="text-gray-700 mb-6">
            Requests can be sent via the Telegram bot or email (see below).
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Use of Cookies</h2>
          <p className="text-gray-700 mb-6">
            We use cookies and tracking pixels to analyze behavior on the site. This helps us improve the user experience. You can disable cookies in your browser settings.
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Contact Information</h2>
          <div className="text-gray-700 mb-6 space-y-2">
            <p><strong>Address:</strong> 6333 Canoga Ave, Apt 255, Woodland Hills, Los Angeles, CA 91367, USA</p>
            <p><strong>Telegram:</strong> @energylogic_callback_bot</p>
            <p><strong>Email:</strong> energylogic@project.ai</p>
            <p><strong>Data Protection Officer:</strong> Artem Khlydov (project founder)</p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Policy Changes</h2>
          <p className="text-gray-700 mb-6">
            This policy may be updated without prior notice. All changes will be reflected on this page with the current revision date.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}