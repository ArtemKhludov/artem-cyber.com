'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Star, Quote, Filter, ThumbsUp } from 'lucide-react'
import Link from 'next/link'

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
    text: "Incredibly accurate analysis! The document opened my eyes to many aspects of my personality that I didn't even suspect. I recommend it to everyone who is ready for an honest look at themselves. I was especially impressed by the recommendations for working with emotional blocks.",
    date: "2024-01-15",
    program: "21 Days",
    verified: true,
    helpful: 47
  },
  {
    id: 2,
    name: "Michael D.",
    rating: 5,
    text: "Professional approach and deep analysis. After reading, I understood many reasons for my behavioral patterns. Worth every dollar spent. Team support is excellent!",
    date: "2024-01-10",
    program: "Deep Day",
    verified: true,
    helpful: 32
  },
  {
    id: 3,
    name: "Elena V.",
    rating: 5,
    text: "It's amazing how AI was able to so accurately describe my inner conflicts and suggest solutions. The document became a real discovery for me. I've already ordered additional materials.",
    date: "2024-01-08",
    program: "Mini Session",
    verified: true,
    helpful: 28
  },
  {
    id: 4,
    name: "Dmitry S.",
    rating: 4,
    text: "Very interesting and useful material. Helped me better understand myself and my relationships with others. Some points seemed too categorical, but overall I'm very satisfied with the result.",
    date: "2024-01-05",
    program: "PDF Analysis",
    verified: true,
    helpful: 19
  },
  {
    id: 5,
    name: "Olga R.",
    rating: 5,
    text: "Revolutionary approach to self-discovery! I never thought analysis could be so accurate and personalized. I've already ordered additional sessions. A team of professionals!",
    date: "2024-01-03",
    program: "21 Days",
    verified: true,
    helpful: 41
  },
  {
    id: 6,
    name: "Alexander P.",
    rating: 5,
    text: "Impressive results in a short time. The analysis helped me understand the causes of my fears and gave me a clear action plan. I recommend it to everyone who wants to understand themselves.",
    date: "2023-12-28",
    program: "Deep Day",
    verified: true,
    helpful: 35
  },
  {
    id: 7,
    name: "Maria L.",
    rating: 4,
    text: "Quality analysis with interesting insights. Some recommendations seem obvious, but there are also truly valuable discoveries. Worth trying.",
    date: "2023-12-25",
    program: "Mini Session",
    verified: true,
    helpful: 15
  },
  {
    id: 8,
    name: "Igor V.",
    rating: 5,
    text: "Amazing accuracy of analysis! The algorithm identified patterns I hadn't noticed for years. The transformation program really works. Life has started to change for the better.",
    date: "2023-12-20",
    program: "21 Days",
    verified: true,
    helpful: 52
  }
]

export function ReviewsPageContent() {
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterProgram, setFilterProgram] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'helpful'>('date')

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
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Client <span className="text-blue-600">Reviews</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real stories from people who changed their lives with EnergyLogic
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(averageRating))}
            </div>
            <div className="text-gray-600 text-sm">Average Rating</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{allReviews.length}</div>
            <div className="text-gray-600 text-sm">Total Reviews</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">96%</div>
            <div className="text-gray-600 text-sm">Recommend to Friends</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">4.8</div>
            <div className="text-gray-600 text-sm">Satisfaction</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
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
              <option value="">All Ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
            </select>

            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Programs</option>
              {programs.map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">By Date</option>
              <option value="rating">By Rating</option>
              <option value="helpful">By Helpfulness</option>
            </select>
          </div>
        </div>

        {/* Reviews */}
        <div className="space-y-6 mb-12">
          {sortedReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {review.name.charAt(0)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-gray-900">{review.name}</h3>
                    {review.verified && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        Verified Review
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
            Become Part of Our Community
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of people who have already started their journey to self-discovery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/catalog">Choose a Program</Link>
            </Button>
            <Button asChild variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
              <Link href="/book">Book a Session</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}