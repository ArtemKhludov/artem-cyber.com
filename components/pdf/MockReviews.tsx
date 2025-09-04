'use client'

import { useState, useEffect } from 'react'
import { Star, Quote } from 'lucide-react'

interface Review {
  id: number
  name: string
  rating: number
  text: string
  date: string
}

const mockReviews: Review[] = [
  {
    id: 1,
    name: "Анна К.",
    rating: 5,
    text: "Невероятно точный анализ! Документ открыл мне глаза на многие аспекты моей личности, о которых я даже не подозревала. Рекомендую всем, кто готов к честному взгляду на себя.",
    date: "2024-01-15"
  },
  {
    id: 2,
    name: "Михаил Д.",
    rating: 5,
    text: "Профессиональный подход и глубокий анализ. После прочтения понял многие причины своих поведенческих паттернов. Стоит каждого потраченного рубля.",
    date: "2024-01-10"
  },
  {
    id: 3,
    name: "Елена В.",
    rating: 5,
    text: "Удивительно, как ИИ смог так точно описать мои внутренние конфликты и предложить пути решения. Документ стал для меня настоящим открытием.",
    date: "2024-01-08"
  },
  {
    id: 4,
    name: "Дмитрий С.",
    rating: 4,
    text: "Очень интересный и полезный материал. Помог лучше понять себя и свои отношения с окружающими. Некоторые моменты показались слишком категоричными, но в целом очень доволен.",
    date: "2024-01-05"
  },
  {
    id: 5,
    name: "Ольга Р.",
    rating: 5,
    text: "Революционный подход к самопознанию! Никогда не думала, что анализ может быть настолько точным и персонализированным. Уже заказала дополнительные сессии.",
    date: "2024-01-03"
  }
]

export function MockReviews() {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % mockReviews.length)
    }, 5000) // Change review every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
      />
    ))
  }

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Отзывы наших клиентов
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Узнайте, что говорят люди о наших PDF-документах и анализах
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main review display */}
          <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 mb-8 relative overflow-hidden">
            <div className="absolute top-6 right-6 text-blue-100">
              <Quote className="w-16 h-16" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {mockReviews[currentReviewIndex].name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {mockReviews[currentReviewIndex].name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {renderStars(mockReviews[currentReviewIndex].rating)}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(mockReviews[currentReviewIndex].date).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>

              <blockquote className="text-lg lg:text-xl text-gray-700 leading-relaxed italic">
                &ldquo;{mockReviews[currentReviewIndex].text}&rdquo;
              </blockquote>
            </div>
          </div>

          {/* Review indicators */}
          <div className="flex justify-center gap-2">
            {mockReviews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentReviewIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentReviewIndex
                  ? 'bg-blue-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
                  }`}
              />
            ))}
          </div>

          {/* Additional reviews preview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {mockReviews.slice(0, 3).map((review, index) => (
              <div
                key={review.id}
                className={`bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 ${index === currentReviewIndex ? 'ring-2 ring-blue-500' : ''
                  }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{review.name}</h4>
                    <div className="flex">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm line-clamp-3">
                  {review.text}
                </p>
              </div>
            ))}
          </div>

          {/* Summary statistics */}
          <div className="bg-white rounded-xl p-6 mt-8 text-center">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">4.8</p>
                <p className="text-sm text-gray-600">Средняя оценка</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">127</p>
                <p className="text-sm text-gray-600">Всего отзывов</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">96%</p>
                <p className="text-sm text-gray-600">Рекомендуют</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
