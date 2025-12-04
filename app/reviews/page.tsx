'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Star, Quote, Filter, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

interface Review {
  id: number
  name: string
  rating: number
  text: string
  date: string
  program: string
  verified: boolean
  helpful: number
}

const allReviews: Review[] = [
  {
    id: 1,
    name: "Anna K.",
    rating: 5,
    text: "Incredibly accurate analysis! The report opened my eyes to many aspects of my personality I never suspected. Highly recommend to anyone ready for an honest look at themselves. Especially impressed by the recommendations for working through emotional blocks.",
    date: "2024-01-15",
    program: "21-day transformation",
    verified: true,
    helpful: 47
  },
  {
    id: 2,
    name: "Mikhail D.",
    rating: 5,
    text: "Professional approach and deep analysis. After reading I understood many reasons behind my behavior patterns. Worth every ruble. The team's support is top-notch!",
    date: "2024-01-10",
    program: "Deep day",
    verified: true,
    helpful: 32
  },
  {
    id: 3,
    name: "Elena V.",
    rating: 5,
    text: "Amazing how the AI described my inner conflicts so precisely and suggested solutions. The report was a real eye-opener. Already ordered extra materials.",
    date: "2024-01-08",
    program: "Mini session",
    verified: true,
    helpful: 28
  },
  {
    id: 4,
    name: "Dmitry S.",
    rating: 4,
    text: "Very interesting and useful material. Helped me better understand myself and my relationships. Some points felt too categorical, but overall I'm very happy with the result.",
    date: "2024-01-05",
    program: "PDF analysis",
    verified: true,
    helpful: 19
  },
  {
    id: 5,
    name: "Olga R.",
    rating: 5,
    text: "A revolutionary approach to self-discovery! Never thought analysis could be this accurate and personalized. Already booked additional sessions. True professionals!",
    date: "2024-01-03",
    program: "21-day transformation",
    verified: true,
    helpful: 41
  },
  {
    id: 6,
    name: "Alexander P.",
    rating: 5,
    text: "Impressive results in a short time. The analysis helped me understand the roots of my fears and gave me a clear action plan. Recommend to anyone who wants to understand themselves.",
    date: "2023-12-28",
    program: "Deep day",
    verified: true,
    helpful: 35
  },
  {
    id: 7,
    name: "Maria L.",
    rating: 4,
    text: "Quality analysis with interesting insights. Some recommendations feel obvious, but there are truly valuable discoveries. Worth trying.",
    date: "2023-12-25",
    program: "Mini session",
    verified: true,
    helpful: 15
  },
  {
    id: 8,
    name: "Igor V.",
    rating: 5,
    text: "Striking accuracy! The algorithm identified patterns I hadn't noticed for years. The transformation program truly works. Life has started changing for the better.",
    date: "2023-12-20",
    program: "21-day transformation",
    verified: true,
    helpful: 52
  }
]

export default function ReviewsPage() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterProgram, setFilterProgram] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'helpful'>('date')
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

  // Get unique programs for filter
  const programs = [...new Set(allReviews.map(review => review.program))]

  // Filter reviews
  const filteredReviews = allReviews.filter(review => {
    if (filterRating && review.rating !== filterRating) return false
    if (filterProgram && review.program !== filterProgram) return false
    return true
  })

  // Sort reviews
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating
      case 'helpful':
        return b.helpful - a.helpful
      case 'date':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
  })

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
      />
    ))
  }

  const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length

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
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Reviews
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-12 text-blue-100 leading-relaxed">
                Real stories from people who transformed their lives<br />
                with EnergyLogic
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-white rounded-xl p-6 shadow-sm text-center border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {averageRating.toFixed(1)}
                  </div>
                  <div className="flex justify-center mb-2">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <div className="text-gray-600 text-sm">Average rating</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm text-center border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{allReviews.length}</div>
                  <div className="text-gray-600 text-sm">Total reviews</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm text-center border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">96%</div>
                  <div className="text-gray-600 text-sm">Recommend to friends</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm text-center border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">4.8</div>
                  <div className="text-gray-600 text-sm">Satisfaction</div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-700">Filters:</span>
                  </div>

                  <select
                    value={filterRating || ''}
                    onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All ratings</option>
                    <option value="5">5 stars</option>
                    <option value="4">4 stars</option>
                    <option value="3">3 stars</option>
                  </select>

                  <select
                    value={filterProgram}
                    onChange={(e) => setFilterProgram(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All programs</option>
                    {programs.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="date">By date</option>
                    <option value="rating">By rating</option>
                    <option value="helpful">By helpfulness</option>
                  </select>
                </div>
              </div>

              {/* Reviews */}
              <div className="space-y-6 mb-12">
                {sortedReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {review.name.charAt(0)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-gray-900">{review.name}</h3>
                          {review.verified && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              Verified review
                            </span>
                          )}
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {review.program}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.date).toLocaleDateString('en-US')}
                          </span>
                        </div>

                        <div className="relative">
                          <Quote className="absolute -top-2 -left-2 w-6 h-6 text-gray-300" />
                          <p className="text-gray-700 leading-relaxed pl-4">{review.text}</p>
                        </div>

                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                          <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm">Helpful ({review.helpful})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Become part of our community
                </h3>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  Join thousands who have already started their journey of self-discovery
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/catalog">Choose a program</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                    <Link href="/book">Book a session</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to start your journey of self-discovery?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands who have already transformed their lives with EnergyLogic
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCallRequest} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Request a call
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/book">
                  Book a session
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
