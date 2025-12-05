'use client'

import { useState, useEffect, useRef } from 'react'
import { Brain, FileText, Users, Shield, Zap, Target, Heart, Sparkles } from 'lucide-react'

export function Advantages() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeAdvantage, setActiveAdvantage] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  const advantages = [
    {
      id: 'ai-analysis',
      icon: Brain,
      title: 'AI Psychoanalysis in Real Time',
      subtitle: 'The technology of the future is here',
      description: 'Our system analyzes not only words, but also intonations, pauses, and emotional reactions. Artificial intelligence processes thousands of parameters, creating an accurate portrait of your personality.',
      features: [
        'Speech pattern analysis',
        'Emotion recognition',
        'Identification of hidden patterns',
        'Behavior prediction'
      ],
      color: 'blue',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      id: 'pdf-report',
      icon: FileText,
      title: 'PDF Report by Phrases and Reactions',
      subtitle: 'Every word matters',
      description: 'Detailed analysis of every phrase you utter. The report contains analysis of your reactions, explanations of hidden meanings, and personalized recommendations for each aspect of personality.',
      features: [
        'Word-by-word speech analysis',
        'Emotional reaction map',
        'Identification of defense mechanisms',
        'Personal insights'
      ],
      color: 'purple',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'support',
      icon: Users,
      title: 'Support and Guidance',
      subtitle: 'You are not alone on the path to change',
      description: 'A team of experienced psychologists and coaches is ready to support you at every stage of transformation. Group sessions, individual consultations, and constant feedback.',
      features: [
        'Personal curator',
        'Support group sessions',
        'Emergency psychological assistance',
        'Community of like-minded people'
      ],
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'honest-approach',
      icon: Shield,
      title: 'Safe Boundaries, but Radical Honesty',
      subtitle: 'Truth that liberates',
      description: 'We create a safe space to work with the deepest traumas and fears. At the same time, our approach involves maximum honesty - only this way real changes are possible.',
      features: [
        'Confidentiality guaranteed',
        'Ethical standards of work',
        'Gentle but direct approach',
        'Working with deep traumas'
      ],
      color: 'orange',
      gradient: 'from-orange-500 to-red-600'
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

  // Auto-switch active advantage
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAdvantage((prev) => (prev + 1) % advantages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [advantages.length])

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0">
        {/* Energy waves */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='0.5' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
          }}></div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <div className="flex justify-center mb-6">
            <Sparkles className="w-12 h-12 text-blue-400 animate-pulse" />
          </div>
          <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">
            Why Choose Us
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
            Technologies that
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {" "}change lives
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We&apos;ve combined the best achievements of psychology, neuroscience, and artificial intelligence
            to create a unique personality transformation system.
          </p>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left part - advantages list */}
          <div className={`space-y-6 transform transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            }`}>
            {advantages.map((advantage, index) => {
              const IconComponent = advantage.icon
              return (
                <div
                  key={advantage.id}
                  className={`group cursor-pointer p-6 rounded-2xl border transition-all duration-300 ${activeAdvantage === index
                    ? 'bg-white/10 border-white/30 shadow-2xl scale-105'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  onClick={() => setActiveAdvantage(index)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${advantage.gradient} shadow-lg`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-white group-hover:text-blue-300 transition-colors">
                        {advantage.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3">{advantage.subtitle}</p>
                      {activeAdvantage === index && (
                        <div className="space-y-2 animate-fadeIn">
                          {advantage.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center text-sm text-gray-300">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                              {feature}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right part - detailed description */}
          <div className={`transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}>
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
              {/* Icon and header */}
              <div className="flex items-center mb-6">
                <div className={`p-4 rounded-2xl bg-gradient-to-r ${advantages[activeAdvantage].gradient} shadow-lg mr-4`}>
                  {(() => {
                    const IconComponent = advantages[activeAdvantage].icon
                    return <IconComponent className="w-8 h-8 text-white" />
                  })()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {advantages[activeAdvantage].title}
                  </h3>
                  <p className="text-blue-400 font-medium">
                    {advantages[activeAdvantage].subtitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-lg leading-relaxed mb-8">
                {advantages[activeAdvantage].description}
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4">
                {advantages[activeAdvantage].features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div className="flex justify-center mt-12 space-x-3">
          {advantages.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveAdvantage(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${activeAdvantage === index
                ? 'bg-blue-400 scale-125 shadow-lg shadow-blue-400/50'
                : 'bg-white/30 hover:bg-white/50'
                }`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </section>
  )
}
