'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Phone, Calendar } from 'lucide-react'
import Link from 'next/link'

interface AboutSectionProps {
  onCallRequest?: () => void
}

export function AboutSection({ onCallRequest }: AboutSectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  const handleCallRequest = () => {
    if (onCallRequest) {
      onCallRequest()
    } else {
      // Fallback behavior
      alert('Call request will be available soon')
    }
  }

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

  return (
    <section id="about" ref={sectionRef} className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text block */}
          <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            }`}>
            <div className="mb-6">
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">
                About EnergyLogic
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
                Revolution in
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {" "}psychoanalysis
                </span>
              </h2>
            </div>

            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p>
                <strong className="text-gray-900">EnergyLogic</strong> is a unique platform that uses
                artificial intelligence for deep psychological analysis. We&apos;ve created a system
                capable of understanding your true essence through analysis of speech, intonation, and emotional responses.
              </p>

              <p>
                Our technology is based on years of research in psychology,
                neurolinguistics, and machine learning. In 20 minutes, the system creates
                a detailed portrait of your personality, revealing hidden behavioral patterns and
                internal conflicts.
              </p>

              <p>
                We don&apos;t just offer analysis - we provide a path to transformation.
                Each client receives a personalized development program based on
                their unique characteristics and needs.
              </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 my-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">10K+</div>
                <div className="text-sm text-gray-600">Sessions completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">98%</div>
                <div className="text-sm text-gray-600">Analysis accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">95%</div>
                <div className="text-sm text-gray-600">Satisfied clients</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleCallRequest} className="bg-blue-600 hover:bg-blue-700 flex items-center">
                <Phone className="mr-2 w-4 h-4" />
                Request a Call
              </Button>
              <Button variant="outline" asChild className="flex items-center">
                <Link href="/book">
                  <Calendar className="mr-2 w-4 h-4" />
                  Book a Session
                </Link>
              </Button>
            </div>
          </div>

          {/* Video block */}
          <div className={`transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}>
            <div className="relative">
              {/* Video container */}
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                <div className="aspect-video relative">
                  {!isPlaying ? (
                    // Preview with Play button
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-purple-600/20">
                      <div className="absolute inset-0 opacity-10">
                        <div className="w-full h-full" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='white' stroke-width='0.5' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
                        }}></div>
                      </div>

                      <button
                        onClick={() => setIsPlaying(true)}
                        className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transform transition-all duration-200 group"
                      >
                        <Play className="w-8 h-8 text-blue-600 ml-1 group-hover:text-blue-700" />
                      </button>

                      {/* Floating elements */}
                      <div className="absolute top-6 left-6 w-12 h-12 bg-blue-500/20 rounded-full animate-pulse"></div>
                      <div className="absolute bottom-6 right-6 w-8 h-8 bg-purple-500/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                      <div className="absolute top-1/2 right-8 w-6 h-6 bg-pink-500/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </div>
                  ) : (
                    // YouTube embed or video placeholder
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&showinfo=0&enablejsapi=0"
                      title="EnergyLogic - How It Works"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                    />
                  )}
                </div>

                {/* Video information */}
                {!isPlaying && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white">
                      <h4 className="font-semibold text-sm">How EnergyLogic Works</h4>
                      <p className="text-xs text-gray-300 mt-1">Learn about the technology and analysis process</p>
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        <div className="flex items-center mr-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                          LIVE
                        </div>
                        <span>4:32</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-2xl opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full blur-2xl opacity-20"></div>
            </div>

            {/* Additional information below video */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-blue-600 mb-1">20 min</div>
                <div className="text-sm text-gray-600">Session duration</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-purple-600 mb-1">24/7</div>
                <div className="text-sm text-gray-600">System availability</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
