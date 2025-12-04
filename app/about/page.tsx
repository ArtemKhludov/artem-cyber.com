'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Brain, Zap, Heart, Target, Users, Award, Shield } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'
import { Legal } from '@/components/home/Legal'

export default function AboutPage() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
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

  const features = [
    {
      icon: Brain,
      title: '🧠 Psychology',
      description: 'Recognition of patterns, fears, and automatisms'
    },
    {
      icon: Zap,
      title: '🧬 Neuroscience',
      description: 'Understanding hormones and emotions that control reactions'
    },
    {
      icon: Heart,
      title: '🤖 AI Analysis',
      description: 'Analysis of words, texts, and micro facial movements'
    },
    {
      icon: Shield,
      title: '🧭 Honesty',
      description: 'Unprecedented honesty as the foundation of change'
    }
  ]

  const whatWeDo = [
    'Identify repeating patterns (self-sacrifice, avoidance, fear of success, false self, etc.)',
    'Understand where you lose energy and control',
    'Make key decisions - not from panic, but from clarity',
    'Get a clear plan based on you, not someone else\'s theory'
  ]

  const implementation = [
    '📡 20-minute voice AI session with analysis and PDF result',
    '📅 21-day track where AI monitors your behavior and thinking, provides reports and hypotheses',
    '📽 Media materials (Reels, articles, presentations) that reveal common misconceptions and patterns'
  ]

  const revolutionPoints = [
    '🤖 AI doesn\'t just help, it diagnoses - in real-time, accurately and deeper than humans',
    '🧬 We combine emotions, hormones, thinking, and patterns into one map - fractal, living, updatable',
    '💥 We don\'t work with symptoms - we uncover the root of the problem and immediately provide a path to change',
    '🚫 We don\'t depend on one "expert\'s" opinion, AI is like hundreds of PhDs in all fields simultaneously - we have no fatigue, ego, bias, or "soft answers"'
  ]

  const forWhom = [
    '🧱 Stuck - in a decision, state, life',
    '🔁 Sees that they repeat the same mistakes but can\'t break free',
    '❌ Tired of others\' advice and "motivation" that don\'t work',
    '🧩 Wants to understand themselves deeper than any books or psychotherapy allowed',
    '⚡️ Ready to hear the truth - and turn it into action'
  ]

  return (
    <div className="relative">
      {/* Main menu */}
      <MainHeader onCallRequest={handleCallRequest} />

      {/* Main content */}
      <main ref={sectionRef}>
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                About <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">EnergyLogic</span>
              </h1>
              <p className="text-xl md:text-2xl mb-12 text-blue-100 leading-relaxed">
                We are EnergyLogic!<br />
                A new system of self-understanding and inner alignment
              </p>
            </div>
          </div>
        </section>

        {/* Main information */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Introduction */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    We combine:
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                  {features.map((feature, index) => (
                    <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center mb-12">
                  <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
                    We show the truth - about you, your patterns, mistakes, key decision points, and resources.
                  </p>
                </div>
              </div>

              {/* What we do */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    🔍 What We Do
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    We create a system of self-diagnosis and consciousness reprogramming that allows:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                  {whatWeDo.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                    This is implemented as:
                  </h3>
                  <div className="space-y-4">
                    {implementation.map((item, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-white font-bold text-xs">•</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Why this is a revolution */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    ⚡️ Why This Is a Revolution
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Because for the first time in history:
                  </p>
                </div>

                <div className="space-y-6">
                  {revolutionPoints.map((point, index) => (
                    <div key={index} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                      <p className="text-gray-700 leading-relaxed text-lg">{point}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-12 p-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
                  <p className="text-xl font-semibold">
                    No human, even the most experienced, can give you such depth, speed, and structure as EnergyLogic.
                  </p>
                </div>
              </div>

              {/* For whom */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    🧭 For Whom
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    For those who:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {forWhom.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">•</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusion */}
              <div className="text-center p-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  EnergyLogic is not about &quot;improving.&quot;
                </h2>
                <p className="text-xl leading-relaxed max-w-3xl mx-auto">
                  It&apos;s about remembering who you are - without noise, lies, and fear.<br />
                  And starting to live from that point.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Legal information */}
        <Legal />

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Start Your Journey to Self-Discovery?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of people who have already changed their lives with EnergyLogic
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCallRequest} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Phone className="mr-2 w-4 h-4" />
                Request a Call
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/book">
                  <Calendar className="mr-2 w-4 h-4" />
                  Book a Session
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Call request modal */}
      <CallRequestModal
        isOpen={isCallModalOpen}
        onClose={handleCloseCallModal}
      />
    </div>
  )
}
