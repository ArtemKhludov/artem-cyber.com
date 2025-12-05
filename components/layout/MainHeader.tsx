'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, Phone } from 'lucide-react'

interface MainHeaderProps {
  onCallRequest?: () => void
}

export function MainHeader({ onCallRequest }: MainHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Product', href: '/product' },
    { name: 'Use Cases', href: '/use-cases' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Investors', href: '/investors' },
    { name: 'Contact', href: '/contacts' },
  ]

  const handleCallRequest = () => {
    if (onCallRequest) {
      onCallRequest()
    } else {
      // Fallback behavior
      alert('Call request will be available soon')
    }
  }


  // Unified style for all pages
  const headerClasses = 'bg-white/95 backdrop-blur-md shadow-lg border-b sticky top-0 z-50'
  const logoClasses = 'text-2xl font-bold text-gray-900'
  const navLinkClasses = (baseClasses: string) => `${baseClasses} text-gray-700`

  const buttonClasses = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300'

  return (
    <header className={headerClasses}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className={logoClasses}>
              Energy<span className="text-blue-500">Logic</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={navLinkClasses('text-sm font-medium hover:text-blue-500')}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Call Request Button */}
            <Button
              size="sm"
              onClick={handleCallRequest}
              className={buttonClasses}
            >
              <Phone className="w-4 h-4 mr-2" />
              Request a Call
            </Button>

            {/* Personal Cabinet Button */}
            <Button
              size="sm"
              asChild
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200"
            >
              <Link href="/auth/login">Dashboard</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-900"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              <div className="px-3 py-2 border-t border-gray-100 space-y-2">
                <Button
                  onClick={() => {
                    handleCallRequest()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Request a Call
                </Button>

                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Link href="/auth/login">Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
