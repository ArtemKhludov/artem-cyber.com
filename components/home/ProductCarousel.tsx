'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Users, Star, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export function ProductCarousel() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  const programs = [
    {
      id: 'mini',
      name: 'Mini-сессия',
      subtitle: 'Быстрая диагностика',
      duration: '20 минут',
      price: '4,999 ₽',
      originalPrice: '6,999 ₽',
      description: 'Экспресс-анализ личности с базовыми рекомендациями. Идеально для первого знакомства с системой.',
      features: [
        'Анализ речевых паттернов',
        'Базовый PDF-отчет',
        'Общие рекомендации',
        'Поддержка 7 дней'
      ],
      popular: false,
      gradient: 'from-blue-500 to-blue-600',
      icon: '⚡'
    },
    {
      id: 'deep',
      name: 'Глубокий день',
      subtitle: 'Полная трансформация',
      duration: '6 часов',
      price: '24,999 ₽',
      originalPrice: '34,999 ₽',
      description: 'Комплексный анализ с детальной проработкой всех аспектов личности и персональной программой развития.',
      features: [
        'Глубокий психоанализ',
        'Детальный PDF-отчет 50+ страниц',
        'Персональная программа развития',
        'Индивидуальные упражнения',
        'Поддержка 30 дней',
        'Дополнительная сессия через месяц'
      ],
      popular: true,
      gradient: 'from-purple-500 to-pink-500',
      icon: '🔮'
    },
    {
      id: 'transformation',
      name: '21 день',
      subtitle: 'Новое «Я»',
      duration: '21 день',
      price: '49,999 ₽',
      originalPrice: '69,999 ₽',
      description: 'Полная трансформация личности за 21 день с ежедневным сопровождением и коучингом.',
      features: [
        'Ежедневные мини-сессии',
        'Персональный куратор',
        'Еженедельные отчеты',
        'Группа поддержки',
        'Финальная сессия с планом на год',
        'Пожизненная поддержка'
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

  // Автопрокрутка карусели
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % programs.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [programs.length])

  return (
    <section id="programs" ref={sectionRef} className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Заголовок секции */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">
            Наши программы
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-2 mb-6">
            Выберите свой путь к 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}трансформации
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Каждая программа разработана для определенного уровня готовности к изменениям. 
            От быстрой диагностики до полной перестройки личности.
          </p>
        </div>

        {/* Карусель программ */}
        <div className="relative">
          {/* Основные карточки */}
          <div className="grid md:grid-cols-3 gap-8">
            {programs.map((program, index) => (
              <div
                key={program.id}
                className={`relative transform transition-all duration-1000 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                {/* Популярный тег */}
                {program.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Популярный выбор
                    </div>
                  </div>
                )}

                {/* Карточка программы */}
                <div className={`relative bg-white rounded-2xl shadow-xl overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                  program.popular ? 'border-purple-200' : 'border-gray-100'
                }`}>
                  {/* Градиентный хедер */}
                  <div className={`bg-gradient-to-r ${program.gradient} p-6 text-white`}>
                    <div className="text-3xl mb-2">{program.icon}</div>
                    <h3 className="text-2xl font-bold mb-1">{program.name}</h3>
                    <p className="text-white/90 text-sm">{program.subtitle}</p>
                  </div>

                  {/* Контент карточки */}
                  <div className="p-6">
                    {/* Цена */}
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

                    {/* Описание */}
                    <p className="text-gray-600 mb-6 text-center">
                      {program.description}
                    </p>

                    {/* Особенности */}
                    <div className="space-y-3 mb-8">
                      {program.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Кнопка */}
                    <Button 
                      asChild 
                      className={`w-full bg-gradient-to-r ${program.gradient} hover:opacity-90 text-white`}
                    >
                      <Link href={`/book?product=${program.id}`}>
                        Записаться
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>

                  {/* Декоративные элементы */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Индикаторы слайдов */}
          <div className="flex justify-center mt-8 space-x-2">
            {programs.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  activeSlide === index 
                    ? 'bg-blue-600 scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className={`mt-16 text-center transform transition-all duration-1000 delay-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Не знаете, какую программу выбрать?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Пройдите бесплатный тест на готовность к изменениям, и мы подберем 
              оптимальную программу именно для вас.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                Пройти тест
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Получить консультацию
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
