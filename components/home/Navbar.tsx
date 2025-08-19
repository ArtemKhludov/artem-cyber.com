'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, Phone } from 'lucide-react'

interface NavbarProps {
  onCallRequest?: () => void
}

export function Navbar({ onCallRequest }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#about', label: 'О проекте' },
    { href: '#programs', label: 'Программы' },
    { href: '#pdf-files', label: 'PDF-файлы' },
    { href: '#reviews', label: 'Отзывы' },
    { href: '#contacts', label: 'Контакты' }
  ]

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  const handleCallRequest = () => {
    if (onCallRequest) {
      onCallRequest()
    } else {
      alert('Заказ звонка будет доступен в ближайшее время')
    }
  }

  return (
    <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold">
            <span className={`transition-colors duration-300 ${
              isScrolled ? 'text-gray-900' : 'text-white'
            }`}>
              Energy<span className="text-blue-500">Logic</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className={`text-sm font-medium transition-colors duration-300 hover:text-blue-500 ${
                  isScrolled ? 'text-gray-700' : 'text-white/90'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Phone and CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Phone Number */}
            <div className="flex items-center space-x-2">
              <Phone className={`w-4 h-4 transition-colors duration-300 ${
                isScrolled ? 'text-gray-600' : 'text-white/80'
              }`} />
              <a 
                href="tel:+79991234567" 
                className={`text-sm font-medium transition-colors duration-300 hover:text-blue-500 ${
                  isScrolled ? 'text-gray-700' : 'text-white/90'
                }`}
              >
                +7 (999) 123-45-67
              </a>
            </div>

            {/* Call Request Button */}
            <Button 
              onClick={handleCallRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
            >
              <Phone className="w-4 h-4 mr-2" />
              Заказать звонок
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden transition-colors duration-300 ${
              isScrolled ? 'text-gray-900' : 'text-white'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="py-4 space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {link.label}
                </button>
              ))}
              
              {/* Mobile Phone */}
              <div className="px-4 py-2 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-gray-700">
                  <Phone className="w-4 h-4" />
                  <a href="tel:+79991234567" className="text-sm font-medium hover:text-blue-600">
                    +7 (999) 123-45-67
                  </a>
                </div>
              </div>

              {/* Mobile Call Button */}
              <div className="px-4">
                <Button 
                  onClick={handleCallRequest}
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
    </nav>
  )
}
