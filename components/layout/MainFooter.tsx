'use client'

import Link from 'next/link'
import { Phone, Mail, MessageCircle } from 'lucide-react'

export function MainFooter() {
  const navigation = [
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Product', href: '/product' },
    { name: 'Use Cases', href: '/use-cases' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Blog', href: '/blog' },
    { name: 'Investors', href: '/investors' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contacts' },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold">
                <span className="text-blue-400">Energy</span>
                <span className="text-white">Logic</span>
              </span>
            </Link>
            <p className="text-gray-300 leading-relaxed max-w-md">
              EnergyLogic is an AI Life Navigation System that guides adults 25–45 out of debt, burnout, and career chaos with a daily adaptive path.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Navigation</h3>
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Contact</h3>
            <div className="space-y-3">
              <a
                href="mailto:support@energylogic-ai.com"
                className="flex items-center text-gray-300 hover:text-blue-400 transition-colors duration-200"
              >
                <Mail className="w-4 h-4 mr-3" />
                support@energylogic-ai.com
              </a>
              <a
                href="tel:+14155550199"
                className="flex items-center text-gray-300 hover:text-blue-400 transition-colors duration-200"
              >
                <Phone className="w-4 h-4 mr-3" />
                +1 (415) 555-0199
              </a>
              <a
                href="https://www.linkedin.com/company/energylogic"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-300 hover:text-blue-400 transition-colors duration-200"
              >
                <MessageCircle className="w-4 h-4 mr-3" />
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} EnergyLogic. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-blue-400 text-sm transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-blue-400 text-sm transition-colors duration-200"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
