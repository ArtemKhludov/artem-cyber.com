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
    name: "Анна К.",
    rating: 5,
    text: "Невероятно точный анализ! Документ открыл мне глаза на многие аспекты моей личности, о которых я даже не подозревала. Рекомендую всем, кто готов к честному взгляду на себя. Особенно впечатлили рекомендации по работе с эмоциональными блоками.",
    date: "2024-01-15",
    program: "21 день трансформации",
    verified: true,
    helpful: 47
  },
  {
    id: 2,
    name: "Михаил Д.",
    rating: 5,
    text: "Профессиональный подход и глубокий анализ. После прочтения понял многие причины своих поведенческих паттернов. Стоит каждого потраченного рубля. Поддержка команды на высшем уровне!",
    date: "2024-01-10",
    program: "Глубокий день",
    verified: true,
    helpful: 32
  },
  {
    id: 3,
    name: "Елена В.",
    rating: 5,
    text: "Удивительно, как ИИ смог так точно описать мои внутренние конфликты и предложить пути решения. Документ стал для меня настоящим открытием. Уже заказала дополнительные материалы.",
    date: "2024-01-08",
    program: "Mini-сессия",
    verified: true,
    helpful: 28
  },
  {
    id: 4,
    name: "Дмитрий С.",
    rating: 4,
    text: "Очень интересный и полезный материал. Помог лучше понять себя и свои отношения с окружающими. Некоторые моменты показались слишком категоричными, но в целом очень доволен результатом.",
    date: "2024-01-05",
    program: "PDF Анализ",
    verified: true,
    helpful: 19
  },
  {
    id: 5,
    name: "Ольга Р.",
    rating: 5,
    text: "Революционный подход к самопознанию! Никогда не думала, что анализ может быть настолько точным и персонализированным. Уже заказала дополнительные сессии. Команда профессионалов!",
    date: "2024-01-03",
    program: "21 день трансформации",
    verified: true,
    helpful: 41
  },
  {
    id: 6,
    name: "Александр П.",
    rating: 5,
    text: "Впечатляющие результаты за короткое время. Анализ помог мне понять причины моих страхов и дал четкий план действий. Рекомендую всем, кто хочет разобраться в себе.",
    date: "2023-12-28",
    program: "Глубокий день",
    verified: true,
    helpful: 35
  },
  {
    id: 7,
    name: "Мария Л.",
    rating: 4,
    text: "Качественный анализ с интересными инсайтами. Некоторые рекомендации кажутся очевидными, но есть и по-настоящему ценные открытия. Стоит попробовать.",
    date: "2023-12-25",
    program: "Mini-сессия",
    verified: true,
    helpful: 15
  },
  {
    id: 8,
    name: "Игорь В.",
    rating: 5,
    text: "Поразительная точность анализа! Алгоритм выявил паттерны, которые я не замечал годами. Программа трансформации действительно работает. Жизнь начала меняться к лучшему.",
    date: "2023-12-20",
    program: "21 день трансформации",
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
            Отзывы <span className="text-blue-600">наших клиентов</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Реальные истории людей, которые изменили свою жизнь с помощью EnergyLogic
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
            <div className="text-gray-600 text-sm">Средняя оценка</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{allReviews.length}</div>
            <div className="text-gray-600 text-sm">Всего отзывов</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">96%</div>
            <div className="text-gray-600 text-sm">Рекомендуют друзьям</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">4.8</div>
            <div className="text-gray-600 text-sm">Удовлетворенность</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">Фильтры:</span>
            </div>
            
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все оценки</option>
              <option value="5">5 звезд</option>
              <option value="4">4 звезды</option>
              <option value="3">3 звезды</option>
            </select>

            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все программы</option>
              {programs.map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">По дате</option>
              <option value="rating">По оценке</option>
              <option value="helpful">По полезности</option>
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
                        Проверенный отзыв
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
                      {new Date(review.date).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Quote className="absolute -top-2 -left-2 w-6 h-6 text-gray-300" />
                    <p className="text-gray-700 leading-relaxed pl-4">{review.text}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">Полезно ({review.helpful})</span>
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
            Станьте частью нашего сообщества
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Присоединяйтесь к тысячам людей, которые уже начали свое путешествие к самопознанию
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/catalog">Выбрать программу</Link>
            </Button>
            <Button asChild variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
              <Link href="/book">Записаться на сессию</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
