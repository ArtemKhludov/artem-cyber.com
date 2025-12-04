'use client'

import { MessageCircle, Send, ArrowLeft, Phone } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/PageLayout'
import { CallRequestModal } from '@/components/modals/CallRequestModal'
import { useState } from 'react'

export default function ChatPage() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }
  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Chat with Experts
            </h1>
            <p className="text-lg text-gray-600">
              Get personalized consultation from our experts in energy diagnostics
            </p>
          </div>

          {/* Chat Interface Placeholder */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">EnergyLogic Expert</h2>
                  <p className="text-blue-100">Online • Ready for Consultation</p>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="h-96 p-6 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Chat will be available soon
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  We are working on integrating the chat system. For now, you can request a call or use other contact methods.
                </p>

                {/* Alternative Contact Methods */}
                <div className="space-y-3">
                  <Button onClick={handleCallRequest} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Phone className="w-4 h-4 mr-2" />
                    Request a Call
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="mailto:energylogic@project.ai">
                      Send Email
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="tel:+15551234567">
                      Call Directly
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Chat Input (Disabled) */}
            <div className="p-6 border-t bg-white">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Chat is temporarily unavailable..."
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <Button disabled className="px-6 py-3 bg-gray-300 cursor-not-allowed">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Chat system is under development. Please use alternative contact methods.
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What can be discussed in chat?
              </h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Questions about documents and materials</li>
                <li>• Personal consultations</li>
                <li>• Choosing the right program</li>
                <li>• Technical support</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Expert Working Hours
              </h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Monday - Friday: 9:00 AM - 9:00 PM</li>
                <li>• Saturday: 10:00 AM - 6:00 PM</li>
                <li>• Sunday: 12:00 PM - 5:00 PM</li>
                <li>• Pacific Time (UTC-8)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Call Request Modal */}
      <CallRequestModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        sourcePage="/chat"
      />
    </PageLayout>
  )
}