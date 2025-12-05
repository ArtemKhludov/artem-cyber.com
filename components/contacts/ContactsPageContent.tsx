'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle,
  User,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'

export function ContactsPageContent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setIsSubmitted(true)

    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      })
    }, 3000)
  }

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: '+7 (999) 123-45-67',
      link: 'tel:+79991234567',
      description: 'Call us from 9:00 to 21:00 (MSK)'
    },
    {
      icon: Mail,
      title: 'Email',
      details: 'energylogic@project.ai',
      link: 'mailto:energylogic@project.ai',
      description: 'We respond within 2 hours'
    },
    {
      icon: MessageCircle,
      title: 'Telegram',
      details: '@energylogic_support',
      link: 'https://t.me/energylogic_support',
      description: 'Fast support in the messenger'
    },
    {
      icon: MapPin,
      title: 'Address',
      details: 'Moscow, Example st. 123',
      link: '#',
      description: 'Office hours Mon–Fri 10:00–18:00'
    }
  ]

  const subjects = [
    'General questions',
    'Technical support',
    'Program questions',
    'Partnership',
    'Press & Media',
    'Other'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get in <span className="text-blue-600">touch</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We are ready to answer your questions and help you choose the right program
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactInfo.map((contact, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <contact.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{contact.title}</h3>
              <a
                href={contact.link}
                className="text-blue-600 hover:text-blue-700 font-medium block mb-2 transition-colors"
                {...(contact.link.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {contact.details}
              </a>
              <p className="text-gray-600 text-sm">{contact.description}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Write to us</h2>

            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Message sent!
                </h3>
                <p className="text-gray-600">
                  We will contact you shortly
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Your name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select a subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Describe your question in detail..."
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send message
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By clicking the button, you agree to our{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                  {' '}and{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Use
                  </Link>
                </p>
              </form>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-8">
            {/* FAQ */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">FAQ</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">How fast do you respond?</h3>
                  <p className="text-gray-600 text-sm">We usually reply within 2 hours during business hours.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Is there a free consultation?</h3>
                  <p className="text-gray-600 text-sm">Yes, we provide a free 15-minute consultation for new clients.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Do you work on weekends?</h3>
                  <p className="text-gray-600 text-sm">Technical support is available 24/7; consultations run Monday–Friday.</p>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Business hours</h2>
              </div>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span>Monday – Friday:</span>
                  <span className="font-medium">9:00 - 21:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span className="font-medium">10:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span className="font-medium">12:00 - 16:00</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                * Times shown for Moscow time zone (MSK)
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick actions</h2>
              <div className="space-y-3">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                  <a href="https://t.me/energylogic_support" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message on Telegram
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/book">
                    Book a consultation
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/catalog">
                    View catalog
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
