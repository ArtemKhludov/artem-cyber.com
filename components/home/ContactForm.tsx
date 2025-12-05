'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Send, Phone, Mail, MapPin, Clock, CheckCircle } from 'lucide-react'

export function ContactForm() {
  const [isVisible, setIsVisible] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your name'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Please enter your phone number'
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please enter your message'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Send data through the same API as the "Request a Call" form
      const response = await fetch('/api/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          message: formData.message,
          preferred_time: '', // Empty field for contact form
          source_page: window.location.pathname,
          product_type: 'contact_form',
          product_name: 'Contact Form',
          notes: `Message: ${formData.message}`
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error sending message')
      }

      setIsSubmitted(true)
      setFormData({ name: '', phone: '', email: '', message: '' })

      // Reset form after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false)
      }, 5000)

    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitError(error instanceof Error ? error.message : 'An error occurred while sending')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      value: '+1 (555) 123-4567',
      subtitle: 'Daily from 9:00 AM to 9:00 PM'
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'support@energylogic.com',
      subtitle: 'We respond within an hour'
    },
    {
      icon: MapPin,
      title: 'Address',
      value: 'New York, NY 10001',
      subtitle: 'Office for in-person meetings'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      value: '9:00 AM - 9:00 PM',
      subtitle: 'Mon-Sun, no holidays'
    }
  ]

  return (
    <section id="contacts" ref={sectionRef} className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='0.5' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
          }}></div>
        </div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">
            Contact Us
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            Ready to change your
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {" "}life?
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Have questions? Want to learn more about our programs?
            Write to us, and we&apos;ll help you choose the perfect path to transformation.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left part - contact information */}
          <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            }`}>
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">How to Contact Us</h3>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => {
                    const IconComponent = info.icon
                    return (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-600 rounded-xl">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">{info.title}</h4>
                          <p className="text-blue-200 font-medium">{info.value}</p>
                          <p className="text-gray-400 text-sm">{info.subtitle}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Additional information */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h4 className="font-semibold text-white mb-4">Quick Start</h4>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    Free consultation in 15 minutes
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    Selection of optimal program
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    Answers to all your questions
                  </div>
                </div>
              </div>

              {/* Social networks */}
              <div>
                <h4 className="font-semibold text-white mb-4">We&apos;re on Social Media</h4>
                <div className="flex space-x-4">
                  {[
                    { name: 'Telegram', href: '#', color: 'bg-blue-500' },
                    { name: 'VK', href: '#', color: 'bg-blue-600' },
                    { name: 'YouTube', href: '#', color: 'bg-red-600' },
                    { name: 'Instagram', href: '#', color: 'bg-purple-600' }
                  ].map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      className={`w-10 h-10 ${social.color} rounded-lg flex items-center justify-center text-white hover:scale-110 transform transition-all duration-200`}
                    >
                      {social.name[0]}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right part - form */}
          <div className={`transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              {!isSubmitted ? (
                <>
                  <h3 className="text-2xl font-bold text-white mb-6">Send Message</h3>

                  {submitError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                      <p className="text-red-200 text-sm">{submitError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.name ? 'border-red-500' : 'border-white/20'
                            }`}
                          placeholder="Enter your name"
                        />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.phone ? 'border-red-500' : 'border-white/20'
                            }`}
                          placeholder="+1 (555) 123-4567"
                        />
                        {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email (optional)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.email ? 'border-red-500' : 'border-white/20'
                          }`}
                        placeholder="your@email.com"
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Message *
                      </label>
                      <textarea
                        rows={4}
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none ${errors.message ? 'border-red-500' : 'border-white/20'
                          }`}
                        placeholder="Tell us how we can help..."
                      />
                      {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message}</p>}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Send className="mr-2 w-5 h-5" />
                          Send Message
                        </div>
                      )}
                    </Button>

                    <p className="text-xs text-gray-400 text-center mt-4">
                      By clicking the button, you agree to our{' '}
                      <Link href="/privacy" className="text-blue-400 hover:underline font-medium">
                        Privacy Policy
                      </Link>
                      {' '}and{' '}
                      <Link href="/terms" className="text-blue-400 hover:underline font-medium">
                        Terms of Service
                      </Link>
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Thank You for Reaching Out!
                  </h3>
                  <p className="text-gray-300 text-lg">
                    We&apos;ve received your message and will contact you within an hour.
                  </p>
                  <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm text-gray-400">
                      Next step: Our specialist will analyze your request and suggest
                      the optimal solution for your situation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
