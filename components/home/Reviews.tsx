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
      name: 'Анна Михайлова',
      age: 34,
      profession: 'Маркетолог',
      avatar: 'AM',
      rating: 5,
      text: 'EnergyLogic перевернул мое представление о себе. За 20 минут сессии я узнала о себе больше, чем за годы самоанализа. PDF-отчет настолько точный, что я несколько раз перечитывала, не веря своим глазам. Особенно поразил анализ моих скрытых страхов — все в точку!',
      program: 'Mini-сессия',
      beforeAfter: {
        before: 'Постоянные сомнения в себе',
        after: 'Уверенность и ясность целей'
      }
    },
    {
      id: 2,
      name: 'Дмитрий Воронин',
      age: 41,
      profession: 'IT-директор',
      avatar: 'ДВ',
      rating: 5,
      text: 'Программа "21 день" кардинально изменила мою жизнь. Я наконец понял, почему застрял в карьере и отношениях. Система выявила глубинные блоки, о которых я даже не подозревал. Теперь я руковожу командой из 50 человек и счастлив в браке.',
      program: '21 день',
      beforeAfter: {
        before: 'Выгорание и кризис среднего возраста',
        after: 'Новая должность и гармония в семье'
      }
    },
    {
      id: 3,
      name: 'Елена Соколова',
      age: 28,
      profession: 'Психолог',
      avatar: 'ЕС',
      rating: 5,
      text: 'Как психолог, я была скептически настроена к ИИ-анализу. Но результат превзошел все ожидания! Система увидела то, что я годами пыталась проработать в терапии. Особенно впечатлил анализ речевых паттернов — каждая пауза и интонация были интерпретированы верно.',
      program: 'Глубокий день',
      beforeAfter: {
        before: 'Профессиональное выгорание',
        after: 'Новый подход к работе с клиентами'
      }
    },
    {
      id: 4,
      name: 'Алексей Петров',
      age: 37,
      profession: 'Предприниматель',
      avatar: 'АП',
      rating: 5,
      text: 'Благодаря EnergyLogic я понял истинные причины неудач в бизнесе. Оказалось, проблема была не в стратегии, а в моих внутренних установках. После прохождения программы открыл новое направление, которое принесло 300% прибыли за полгода.',
      program: '21 день',
      beforeAfter: {
        before: 'Череда неудачных проектов',
        after: 'Успешный стартап и финансовая свобода'
      }
    },
    {
      id: 5,
      name: 'Мария Кузнецова',
      age: 45,
      profession: 'Врач',
      avatar: 'МК',
      rating: 5,
      text: 'В 45 лет я думала, что уже поздно что-то менять. EnergyLogic показал мне, что я только в начале пути. Анализ выявил мой скрытый творческий потенциал. Сейчас я не только врач, но и художник — открыла персональную выставку!',
      program: 'Глубокий день',
      beforeAfter: {
        before: 'Ощущение упущенных возможностей',
        after: 'Реализация творческого потенциала'
      }
    },
    {
      id: 6,
      name: 'Игорь Смирнов',
      age: 31,
      profession: 'Тренер',
      avatar: 'ИС',
      rating: 5,
      text: 'Работая с людьми, я думал, что хорошо разбираюсь в психологии. EnergyLogic открыл мне глаза на собственные проблемы. Система точно определила мои защитные механизмы и показала, как они мешают близости. Наконец-то нашел свою половинку!',
      program: 'Mini-сессия',
      beforeAfter: {
        before: 'Одиночество и страх близости',
        after: 'Счастливые отношения и помолвка'
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

  // Автопрокрутка
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
        {/* Заголовок секции */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <span className="text-green-600 font-semibold text-sm uppercase tracking-wide">
            Отзывы клиентов
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
            Истории 
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {" "}трансформации
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Более 10,000 человек уже изменили свою жизнь с помощью EnergyLogic. 
            Прочитайте их истории и убедитесь сами.
          </p>
        </div>

        {/* Карусель отзывов */}
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
                      {/* Левая часть - информация о клиенте */}
                      <div className="text-center md:text-left">
                        {/* Аватар */}
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full text-white text-xl font-bold mb-4">
                          {review.avatar}
                        </div>
                        
                        {/* Информация */}
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{review.name}</h3>
                        <p className="text-gray-600 mb-1">{review.age} лет, {review.profession}</p>
                        <div className="flex justify-center md:justify-start mb-4">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                          ))}
                        </div>
                        
                        {/* Программа */}
                        <div className="inline-block bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                          {review.program}
                        </div>
                      </div>

                      {/* Центральная часть - отзыв */}
                      <div className="md:col-span-2">
                        <div className="relative">
                          <Quote className="absolute -top-2 -left-2 w-8 h-8 text-green-200" />
                          <blockquote className="text-lg text-gray-700 leading-relaxed mb-6 pl-6">
                            {review.text}
                          </blockquote>
                        </div>

                        {/* До/После */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <h4 className="font-semibold text-red-800 mb-2 text-sm uppercase tracking-wide">
                              До EnergyLogic
                            </h4>
                            <p className="text-red-700 text-sm">{review.beforeAfter.before}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <h4 className="font-semibold text-green-800 mb-2 text-sm uppercase tracking-wide">
                              После EnergyLogic
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

          {/* Навигация */}
          <div className="flex items-center justify-center mt-8 space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              className="w-10 h-10 rounded-full p-0 border-green-200 hover:bg-green-50"
            >
              <ChevronLeft className="w-4 h-4 text-green-600" />
            </Button>

            {/* Индикаторы */}
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

        {/* Статистика */}
        <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 transform transition-all duration-1000 delay-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {[
            { number: '10,000+', label: 'Довольных клиентов' },
            { number: '98%', label: 'Положительных отзывов' },
            { number: '4.9/5', label: 'Средняя оценка' },
            { number: '50+', label: 'Городов России' }
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
              <div className="text-3xl font-bold text-green-600 mb-2">{stat.number}</div>
              <div className="text-gray-600 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA блок */}
        <div className={`mt-16 text-center transform transition-all duration-1000 delay-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Готовы написать свою историю успеха?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам людей, которые уже изменили свою жизнь. 
              Ваша трансформация начинается с первой сессии.
            </p>
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
              Начать трансформацию
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
