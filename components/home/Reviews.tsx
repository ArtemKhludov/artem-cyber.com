'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Reviews() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)

  const reviews = [
    {
      id: 1,
      name: 'Anna Mitchell',
      age: 34,
      profession: 'Marketing Manager',
      avatar: 'AM',
      rating: 5,
      text: 'EnergyLogic completely changed my self-perception. In 20 minutes of the session, I learned more about myself than in years of self-analysis. The PDF report is so accurate that I reread it multiple times, not believing my eyes. The analysis of my hidden fears was especially striking — everything was spot on!',
      program: 'Mini Session',
      beforeAfter: {
        before: 'Constant self-doubt',
        after: 'Confidence and clarity of goals'
      }
    },
    {
      id: 2,
      name: 'David Warren',
      age: 41,
      profession: 'IT Director',
      avatar: 'DW',
      rating: 5,
      text: 'The "21 Days" program radically changed my life. I finally understood why I was stuck in my career and relationships. The system revealed deep blocks I didn\'t even suspect existed. Now I manage a team of 50 people and am happily married.',
      program: '21 Days',
      beforeAfter: {
        before: 'Burnout and midlife crisis',
        after: 'New position and family harmony'
      }
    },
    {
      id: 3,
      name: 'Elena Scott',
      age: 28,
      profession: 'Psychologist',
      avatar: 'ES',
      rating: 5,
      text: 'As a psychologist, I was skeptical about AI analysis. But the result exceeded all expectations! The system saw what I had been trying to work through in therapy for years. The analysis of speech patterns was especially impressive — every pause and intonation was interpreted correctly.',
      program: 'Deep Day',
      beforeAfter: {
        before: 'Professional burnout',
        after: 'New approach to working with clients'
      }
    },
    {
      id: 4,
      name: 'Alex Peterson',
      age: 37,
      profession: 'Entrepreneur',
      avatar: 'AP',
      rating: 5,
      text: 'Thanks to EnergyLogic, I understood the true causes of business failures. It turned out the problem wasn\'t in strategy, but in my internal patterns. After completing the program, I opened a new direction that brought 300% profit in half a year.',
      program: '21 Days',
      beforeAfter: {
        before: 'Series of failed projects',
        after: 'Successful startup and financial freedom'
      }
    },
    {
      id: 5,
      name: 'Maria Kuznets',
      age: 45,
      profession: 'Doctor',
      avatar: 'MK',
      rating: 5,
      text: 'At 45, I thought it was too late to change anything. EnergyLogic showed me I\'m just at the beginning of the journey. The analysis revealed my hidden creative potential. Now I\'m not only a doctor but also an artist — I opened a personal exhibition!',
      program: 'Deep Day',
      beforeAfter: {
        before: 'Feeling of missed opportunities',
        after: 'Realization of creative potential'
      }
    },
    {
      id: 6,
      name: 'Igor Smith',
      age: 31,
      profession: 'Coach',
      avatar: 'IS',
      rating: 5,
      text: 'Working with people, I thought I understood psychology well. EnergyLogic opened my eyes to my own problems. The system accurately identified my defense mechanisms and showed how they hinder intimacy. Finally found my soulmate!',
      program: 'Mini Session',
      beforeAfter: {
        before: 'Loneliness and fear of intimacy',
        after: 'Happy relationship and engagement'
      }
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

  // Auto-scroll
  useEffect(() => {
    if (!isAutoPlay) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % reviews.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [reviews.length, isAutoPlay])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % reviews.length)
    setIsAutoPlay(false)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + reviews.length) % reviews.length)
    setIsAutoPlay(false)
  }

  return (
    <section id="reviews" ref={sectionRef} className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <span className="text-green-600 font-semibold text-sm uppercase tracking-wide">
            Client Reviews
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
            Stories of
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {" "}transformation
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Over 10,000 people have already changed their lives with EnergyLogic. 
            Read their stories and see for yourself.
          </p>
        </div>

        {/* Reviews carousel */}
        <div className="relative max-w-6xl mx-auto">
          <div className="overflow-hidden rounded-3xl">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {reviews.map((review, index) => (
                <div key={review.id} className="w-full flex-shrink-0">
                  <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mx-4 border border-gray-100">
                    <div className="grid md:grid-cols-3 gap-8 items-start">
                      {/* Left part - client information */}
                      <div className="text-center md:text-left">
                        {/* Avatar */}
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full text-white text-xl font-bold mb-4">
                          {review.avatar}
                        </div>
                        
                        {/* Information */}
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{review.name}</h3>
                        <p className="text-gray-600 mb-1">{review.age} years old, {review.profession}</p>
                        <div className="flex justify-center md:justify-start mb-4">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                          ))}
                        </div>
                        
                        {/* Program */}
                        <div className="inline-block bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                          {review.program}
                        </div>
                      </div>

                      {/* Center part - review */}
                      <div className="md:col-span-2">
                        <div className="relative">
                          <Quote className="absolute -top-2 -left-2 w-8 h-8 text-green-200" />
                          <blockquote className="text-lg text-gray-700 leading-relaxed mb-6 pl-6">
                            {review.text}
                          </blockquote>
                        </div>

                        {/* Before/After */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <h4 className="font-semibold text-red-800 mb-2 text-sm uppercase tracking-wide">
                              Before EnergyLogic
                            </h4>
                            <p className="text-red-700 text-sm">{review.beforeAfter.before}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <h4 className="font-semibold text-green-800 mb-2 text-sm uppercase tracking-wide">
                              After EnergyLogic
                            </h4>
                            <p className="text-green-700 text-sm">{review.beforeAfter.after}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center mt-8 space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              className="w-10 h-10 rounded-full p-0 border-green-200 hover:bg-green-50"
            >
              <ChevronLeft className="w-4 h-4 text-green-600" />
            </Button>

            {/* Indicators */}
            <div className="flex space-x-2">
              {reviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentSlide(index)
                    setIsAutoPlay(false)
                  }}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? 'bg-green-600 scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              className="w-10 h-10 rounded-full p-0 border-green-200 hover:bg-green-50"
            >
              <ChevronRight className="w-4 h-4 text-green-600" />
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 transform transition-all duration-1000 delay-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {[
            { number: '10,000+', label: 'Satisfied Clients' },
            { number: '98%', label: 'Positive Reviews' },
            { number: '4.9/5', label: 'Average Rating' },
            { number: '50+', label: 'US Cities' }
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
              <div className="text-3xl font-bold text-green-600 mb-2">{stat.number}</div>
              <div className="text-gray-600 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA block */}
        <div className={`mt-16 text-center transform transition-all duration-1000 delay-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to write your success story?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of people who have already changed their lives. 
              Your transformation begins with your first session.
            </p>
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
              Start Transformation
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
