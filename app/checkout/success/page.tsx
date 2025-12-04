import { Suspense } from 'react'
import { CheckCircle, Download, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/PageLayout'

export const metadata = {
  title: 'Payment complete - EnergyLogic',
  description: 'Thank you for your purchase! Your document is ready to download.',
}

function SuccessPageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment completed successfully!
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Thank you for your purchase! Your document is ready to download.
            We also sent a download link to your email.
          </p>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Download Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Download document
              </h3>
              <p className="text-gray-600 mb-4">
                Get instant access to your purchased PDF
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Download now
              </Button>
            </div>

            {/* Email Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Check your email
              </h3>
              <p className="text-gray-600 mb-4">
                We've sent the download link and receipt to your email
              </p>
              <Button variant="outline" className="w-full border-purple-500 text-purple-600 hover:bg-purple-50">
                <Mail className="w-4 h-4 mr-2" />
                Didn't get the email?
              </Button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What's next?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Download the file</h4>
                <p className="text-gray-600">Save the PDF to your device for quick access</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Study the material</h4>
                <p className="text-gray-600">Apply the insights to your life</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Get support</h4>
                <p className="text-gray-600">Reach out to our experts if you have questions</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" className="border-gray-300">
              <Link href="/catalog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to catalog
              </Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/">
                Back to home
              </Link>
            </Button>
          </div>

          {/* Support Info */}
          <div className="mt-12 p-6 bg-gray-50 rounded-xl">
            <h4 className="font-semibold text-gray-900 mb-2">Need help?</h4>
            <p className="text-gray-600 mb-4">
              If you have issues with the download or any questions, contact us:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:energylogic@project.ai" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                energylogic@project.ai
              </a>
              <span className="hidden sm:inline text-gray-400">•</span>
              <a 
                href="tel:+15551234567" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                +1 (555) 123-4567
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <PageLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        </div>
      }>
        <SuccessPageContent />
      </Suspense>
    </PageLayout>
  )
}
