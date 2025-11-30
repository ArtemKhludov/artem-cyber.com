'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Users, Star, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface ProductCarouselProps {
  onCallRequest?: () => void
}

export function ProductCarousel({ onCallRequest }: ProductCarouselProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  const handleCallRequest = () => {
    if (onCallRequest) {
      onCallRequest()
    } else {
      // Fallback - open modal directly
      window.location.href = '/contacts'
    }
  }

  const programs = [
    {
      id: 'mini-session',
      name: 'Mini Session',
      subtitle: 'Quick Diagnostics',
      duration: '20 minutes',
      price: '$49.99',
      originalPrice: '$69.99',
      description: 'Express personality analysis with basic recommendations. Perfect for first-time users.',
      features: [
        'Speech pattern analysis',
        'Basic PDF report',
        'General recommendations',
        '7 days support'
      ],
      popular: false,
      gradient: 'from-blue-500 to-blue-600',
      icon: '⚡'
    },
    {
      id: 'deep-day',
      name: 'Deep Day',
      subtitle: 'Full Transformation',
      duration: '6 hours',
      price: '$249.99',
      originalPrice: '$349.99',
      description: 'Comprehensive analysis with detailed work on all aspects of personality and a personalized development program.',
      features: [
        'Deep psychoanalysis',
        'Detailed PDF report 50+ pages',
        'Personal development program',
        'Individual exercises',
        '30 days support',
        'Additional session after one month'
      ],
      popular: true,
      gradient: 'from-purple-500 to-pink-500',
      icon: '🔮'
    },
    {
      id: 'transformation-21',
      name: '21 Days',
      subtitle: 'New "You"',
      duration: '21 days',
      price: '$499.99',
      originalPrice: '$699.99',
      description: 'Complete personality transformation in 21 days with daily support and coaching.',
      features: [
        'Daily mini-sessions',
        'Personal curator',
        'Weekly reports',
        'Support group',
        'Final session with annual plan',
        'Lifetime support'
      ],
      popular: false,
      gradient: 'from-emerald-500 to-teal-500',
      icon: '🚀'
    }
  ]

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

  // Carousel auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % programs.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [programs.length])

  return (
    <section id="programs" ref={sectionRef} className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">
            Our Programs
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
            Choose your path to
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}transformation
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Each program is designed for a specific level of readiness for change.
            From quick diagnostics to complete personality restructuring.
          </p>
        </div>

        {/* Programs carousel */}
        <div className="relative">
          {/* Main cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {programs.map((program, index) => (
              <div
                key={program.id}
                className={`relative transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                {/* Popular tag */}
                {program.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Popular Choice
                    </div>
                  </div>
                )}

                {/* Program card */}
                <div className={`relative bg-white rounded-2xl shadow-xl overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${program.popular ? 'border-purple-200' : 'border-gray-100'
                  }`}>
                  {/* Gradient header */}
                  <div className={`bg-gradient-to-r ${program.gradient} p-6 text-white`}>
                    <div className="text-3xl mb-2">{program.icon}</div>
                    <h3 className="text-2xl font-bold mb-1">{program.name}</h3>
                    <p className="text-white/90 text-sm">{program.subtitle}</p>
                  </div>

                  {/* Card content */}
                  <div className="p-6">
                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold text-gray-900">{program.price}</span>
                        {program.originalPrice && (
                          <span className="text-lg text-gray-500 line-through ml-2">{program.originalPrice}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-center mt-2 text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{program.duration}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 mb-6 text-center">
                      {program.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      {program.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Button */}
                    <Button
                      asChild
                      className={`w-full bg-gradient-to-r ${program.gradient} hover:opacity-90 text-white`}
                    >
                      <Link href={`/book?product=${program.id}`}>
                        Book Now
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Slide indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {programs.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${activeSlide === index
                    ? 'bg-blue-600 scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Additional information */}
        <div className={`mt-16 text-center transform transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Not sure which program to choose?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Take our free readiness test, and we'll select
              the optimal program for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                Take Test
              </Button>
              <Button 
                onClick={handleCallRequest}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Get Consultation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
