'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, Menu, X } from 'lucide-react'

interface MainHeaderProps {
  onCallRequest?: () => void
}

export function MainHeader({ onCallRequest }: MainHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'О проекте', href: '/about' },
    { name: 'Каталог', href: '/catalog' },
    { name: 'Отзывы', href: '/reviews' },
    { name: 'Контакты', href: '/contacts' },
  ]

  const handleCallRequest = () => {
    if (onCallRequest) {
      onCallRequest()
    } else {
      // Fallback behavior
      alert('Заказ звонка будет доступен в ближайшее время')
    }
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold">
              <span className="text-blue-600">Energy</span>
              <span className="text-gray-900">Logic</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Phone and Call to Action Button */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Phone Number */}
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-600" />
              <a 
                href="tel:+79991234567" 
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                +7 (999) 123-45-67
              </a>
            </div>

            {/* Call Request Button */}
            <Button
              onClick={handleCallRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
            >
              <Phone className="w-4 h-4 mr-2" />
              Заказать звонок
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
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
          <div className="md:hidden border-t bg-white">
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
              
              {/* Mobile Phone */}
              <div className="px-3 py-2 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-gray-700">
                  <Phone className="w-4 h-4" />
                  <a href="tel:+79991234567" className="text-sm font-medium hover:text-blue-600">
                    +7 (999) 123-45-67
                  </a>
                </div>
              </div>

              <div className="px-3 py-2">
                <Button
                  onClick={() => {
                    handleCallRequest()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Заказать звонок
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
