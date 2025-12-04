import { PageLayout } from '@/components/layout/PageLayout'

export default function RefundPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Refund Policy</h1>

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
              <strong>1.1.</strong> EnergyLogic platform provides digital services: access to interactive tests, personalized analytical reports, courses, consultation materials, and online programs.
            </p>
            <p>
              <strong>1.2.</strong> According to international practice and applicable legislation, digital content provided immediately after payment is not subject to refund, if the user has previously consented to immediate delivery and acknowledged the loss of the right to cancel the purchase.
            </p>
            <p>
              <strong>1.3.</strong> By placing an order, you agree that access to materials or results may be provided immediately (including automatically), which is equivalent to full service delivery.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Refund Conditions</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>2.1.</strong> We provide refunds in exceptional cases, if:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>the service was not provided due to technical reasons (e.g., system failure, duplicate payment);</li>
              <li>the user did not receive access to materials despite confirmed payment;</li>
              <li>an amount different from the stated price was charged.</li>
            </ul>
            <p>
              <strong>2.2.</strong> All refund requests are considered on a case-by-case basis. In most cases, we offer:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>resolution of the technical issue;</li>
              <li>re-access to materials;</li>
              <li>service transfer or replacement.</li>
            </ul>
            <p>
              <strong>2.3.</strong> Refunds are not provided if:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>the user has received access to courses, test results, or other digital materials;</li>
              <li>the test/session has already been completed or started;</li>
              <li>the request is submitted more than 3 calendar days after purchase;</li>
              <li>the user expected a specific effect, but the result was subjectively different (as therapeutic effect is not guaranteed).</li>
            </ul>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How to Submit a Refund Request</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>3.1.</strong> If you believe an error has occurred, contact us via email or Telegram:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg my-4">
              <p><strong>Email:</strong> energylogic.help@gmail.com</p>
              <p><strong>Telegram Bot:</strong> @energylogic_callback_bot</p>
            </div>
            <p>
              <strong>3.2.</strong> Please provide:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>date and payment method;</li>
              <li>email address used for purchase;</li>
              <li>description of the situation.</li>
            </ul>
            <p>
              <strong>3.3.</strong> We review requests within 3 business days and will provide you with a decision.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Additional Terms</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>4.1.</strong> Refunds are processed to the same payment system used for the original payment.
            </p>
            <p>
              <strong>4.2.</strong> Upon refund, access to materials is automatically blocked.
            </p>
            <p>
              <strong>4.3.</strong> Payment system fees (if any were charged) may not be compensated.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
