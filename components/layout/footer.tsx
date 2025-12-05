'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Send } from 'lucide-react'

export function Footer() {

  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="lg:col-span-2">
            <Link href="/" className="text-3xl font-bold text-blue-400 mb-4 block">
              Energy<span className="text-white">Logic</span>
            </Link>
            <p className="text-gray-300 max-w-md mb-6 leading-relaxed">
              A revolutionary platform for deep personal transformation.
              We use AI and advanced tech to analyze and improve lives.
            </p>

            {/* Contact info */}
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Phone className="w-4 h-4 mr-3 text-blue-400" />
                <a href="tel:+79991234567" className="hover:text-white transition-colors">
                  +7 (999) 123-45-67
                </a>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="w-4 h-4 mr-3 text-blue-400" />
                <a href="mailto:support@energylogic.com" className="hover:text-white transition-colors">
                  support@energylogic.com
                </a>
              </div>
              <div className="flex items-start text-gray-300">
                <MapPin className="w-4 h-4 mr-3 text-blue-400 mt-0.5" />
                <span>Moscow, Example st. 123</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Navigation</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/book"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  Programs
                </Link>
              </li>
              <li>
                <Link
                  href="/catalog"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  Courses
                </Link>
              </li>
              <li>
                <Link
                  href="/reviews"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  Reviews
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  Contacts
                </Link>
              </li>
            </ul>
          </div>

          {/* Services & support */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Services</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/book" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Book a session
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Buy a program
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Support center
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-blue-400 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social */}
        <div className="border-t border-gray-800 pt-8 mt-12">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <div className="mb-6 lg:mb-0">
              <h4 className="text-lg font-semibold text-white mb-4">Follow us</h4>
              <div className="flex space-x-4">
                {[
                  { name: 'Telegram', href: 'https://t.me/energylogic', icon: '🔵', color: 'hover:bg-blue-500' },
                  { name: 'VK', href: 'https://vk.com/energylogic', icon: '📘', color: 'hover:bg-blue-600' },
                  { name: 'YouTube', href: 'https://youtube.com/@energylogic', icon: '🔴', color: 'hover:bg-red-600' },
                  { name: 'Instagram', href: 'https://instagram.com/energylogic', icon: '🟣', color: 'hover:bg-purple-600' }
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 ${social.color}`}
                    title={social.name}
                  >
                    <span className="text-lg">{social.icon}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="w-full lg:w-auto">
              <h4 className="text-lg font-semibold text-white mb-4 text-center lg:text-left">
                Subscribe for updates
              </h4>
              <div className="flex max-w-md mx-auto lg:mx-0">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-l-none">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center lg:text-left">
                Get updates on new programs and discounts
              </p>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="text-center lg:text-left">
              <p className="text-gray-400 text-sm">
                © 2024 EnergyLogic. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                LLC “EnergyLogic” • TIN: 1234567890 • OGRN: 1234567890123
              </p>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-end space-x-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/refund" className="text-gray-400 hover:text-white transition-colors">
                Refunds
              </Link>
              <Link href="/disclaimer" className="text-gray-400 hover:text-white transition-colors">
                Disclaimer
              </Link>
              <Link href="/sitemap" className="text-gray-400 hover:text-white transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl mb-2">🔒</div>
              <h5 className="font-semibold text-white mb-1">Security</h5>
              <p className="text-xs text-gray-400">SSL encryption and data protection</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl mb-2">🏆</div>
              <h5 className="font-semibold text-white mb-1">Quality</h5>
              <p className="text-xs text-gray-400">Certified experts</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h5 className="font-semibold text-white mb-1">Innovation</h5>
              <p className="text-xs text-gray-400">Cutting-edge AI technology</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
