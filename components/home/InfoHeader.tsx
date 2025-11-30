'use client'

import { Button } from '@/components/ui/button'
import { Phone } from 'lucide-react'

interface InfoHeaderProps {
  onCallRequest?: () => void
}

export function InfoHeader({ onCallRequest }: InfoHeaderProps) {
  const handleCallRequest = () => {
    if (onCallRequest) {
      onCallRequest()
    } else {
      // Fallback behavior for backwards compatibility
      alert('Call request will be available soon')
    }
  }

  return (
    <div className="bg-slate-900 text-white py-2">
      <div className="container mx-auto px-4 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4" />
          <a href="tel:+15551234567" className="hover:text-blue-300 transition-colors">
            +1 (555) 123-4567
          </a>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleCallRequest}
          className="text-white hover:bg-slate-800"
        >
          Request a Call
        </Button>
      </div>
    </div>
  )
}