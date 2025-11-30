'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Phone, X } from 'lucide-react'

interface PhonePromptModalProps {
  isOpen: boolean
  onSubmit: (phone: string) => void
  onSkip: () => void
}

export function PhonePromptModal({ isOpen, onSubmit, onSkip }: PhonePromptModalProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone.trim()) {
      setError('Please enter a phone number')
      return
    }

    // Simple phone validation
    const phoneRegex = /^[+]?[\d\s()-]{10,}$/
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid phone number')
      return
    }

    onSubmit(phone)
  }

  const handleSkip = () => {
    setPhone('')
    setError('')
    onSkip()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Add Phone Number</h3>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Provide your phone number for emergency contact and additional account security.
          You can skip this step and add a number later in settings.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setError('')
                }}
                className="pl-10"
                placeholder="+1 (555) 123-4567"
                autoFocus
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </Button>
            <Button
              type="button"
              onClick={handleSkip}
              variant="outline"
              className="flex-1"
            >
              Skip
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          You can always add or change your phone number in profile settings
        </p>
      </div>
    </div>
  )
}
