import { PageLayout } from '@/components/layout/PageLayout'

export default function TermsPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>

        <div className="prose prose-lg max-w-none">
          <div className="text-gray-600 text-lg mb-8 space-y-2">
            <p>Effective Date: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p>Last Updated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. General Provisions</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>1.1.</strong> This agreement (hereinafter — "Agreement") governs the relationship between the user (hereinafter — "User") and the owners of the EnergyLogic platform (hereinafter — "Administration").
            </p>
            <p>
              <strong>1.2.</strong> By using the site, you confirm your agreement with the terms of this Agreement. If you disagree with any provision, please discontinue use of the site.
            </p>
            <p>
              <strong>1.3.</strong> At this stage, the Administration operates without legal entity registration. The project is experimental and provided as a private initiative.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Nature of Service</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>2.1.</strong> EnergyLogic provides access to proprietary materials, courses, online tests, analytics, and results generated using intelligent algorithms and language models (e.g., GPT from OpenAI).
            </p>
            <p>
              <strong>2.2.</strong> The platform is not:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>a medical, psychotherapeutic, or counseling institution;</li>
              <li>an accredited educational center;</li>
              <li>a provider of services subject to mandatory licensing.</li>
            </ul>
            <p>
              <strong>2.3.</strong> All information on the site is solely informational, analytical, and educational. It is not a substitute for professional consultation and should not be interpreted as guidance for action regarding health, psychology, or life-critical decisions.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Jurisdiction and Liability</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>3.1.</strong> Interaction with the platform is conducted from the jurisdiction of the United States, State of California.
            </p>
            <p>
              <strong>3.2.</strong> The user is responsible for ensuring that use of the service complies with the laws of their country and agrees to independently verify the legality of handling the presented materials in their jurisdiction.
            </p>
            <p>
              <strong>3.3.</strong> The Administration makes reasonable efforts to ensure the service operates correctly, but does not guarantee the absence of technical failures, generation errors, delays, or data loss related to the use of third-party APIs and internet services.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Data Processing and Protection</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>4.1.</strong> The user agrees to the processing of provided data (including but not limited to: name, email, Telegram account, test results) for the operation of the platform and to improve the quality of services provided.
            </p>
            <p>
              <strong>4.2.</strong> Data processing is carried out in accordance with international privacy and security standards. For more details, see the <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>
            <p>
              <strong>4.3.</strong> The platform may use cookies, session/local storage, and behavior analytics on the site for technical optimization purposes.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Restrictions</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>5.1.</strong> The user is prohibited from:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>using the platform for purposes contrary to applicable law;</li>
              <li>copying, distributing, or commercially using materials without written permission;</li>
              <li>attempting to change the service logic or interfere with the platform's functioning.</li>
            </ul>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Intellectual Property</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>6.1.</strong> All materials published on the site are the intellectual property of the Administration or invited authors and are protected by copyright.
            </p>
            <p>
              <strong>6.2.</strong> Their use is possible only within the framework of personal, non-commercial familiarization, unless otherwise agreed separately.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Changes to Agreement</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>7.1.</strong> The Administration reserves the right to make changes to this Agreement without prior notice. Changes take effect from the moment of publication on the site.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Contacts</h2>
          <div className="text-gray-700 mb-6 space-y-2">
            <p><strong>Telegram Bot:</strong> @energylogic_callback_bot</p>
            <p><strong>Email:</strong> energylogic.help@gmail.com</p>
            <p><strong>Location:</strong> Los Angeles, California, USA</p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}