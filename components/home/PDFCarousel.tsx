'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { DocumentCard } from '@/components/common/DocumentCard'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'

export function PDFCarousel() {
  const [isVisible, setIsVisible] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const cardWidth = 400; // Ширина одной карточки + gap

  // Создаем бесконечный массив с тройным дублированием
  const infiniteDocuments = documents.length > 0 ? [
    ...documents, // Набор 1
    ...documents, // Набор 2  
    ...documents  // Набор 3
  ] : [];

  const startIndex = documents.length; // Начинаем с середины (набор 2)

  // Функция перемещения к слайду
  const moveToSlide = (index: number, withTransition = true) => {
    if (!carouselRef.current || isTransitioning) return;

    console.log(`Перемещаемся к слайду ${index}, переход: ${withTransition}`);

    setIsTransitioning(withTransition);
    carouselRef.current.style.transition = withTransition ? 'transform 0.5s ease-in-out' : 'none';
    carouselRef.current.style.transform = `translateX(-${index * cardWidth}px)`;
    setCurrentIndex(index);

    if (withTransition) {
      setTimeout(() => {
        setIsTransitioning(false);
        checkForLoop(index);
      }, 500);
    }
  };

  // Проверка на зацикливание
  const checkForLoop = (index: number) => {
    if (!carouselRef.current || documents.length === 0) return;

    // Если дошли до последнего набора - перепрыгиваем в начало среднего набора
    if (index >= documents.length * 2) {
      const newIndex = index - documents.length;
      console.log(`Зацикливание в конце: ${index} -> ${newIndex}`);
      moveToSlide(newIndex, false);
    }
    // Если дошли до первого набора - перепрыгиваем в конец среднего набора  
    else if (index < documents.length) {
      const newIndex = index + documents.length;
      console.log(`Зацикливание в начале: ${index} -> ${newIndex}`);
      moveToSlide(newIndex, false);
    }
  };

  // Управление каруселью
  const slideLeft = () => {
    if (isTransitioning) return;
    console.log("slideLeft clicked!");
    moveToSlide(currentIndex - 1);
  };

  const slideRight = () => {
    if (isTransitioning) return;
    console.log("slideRight clicked!");
    moveToSlide(currentIndex + 1);
  };

  // Загрузка документов
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6)

        if (error) {
          console.error('Error fetching documents:', error)
          setError('Ошибка загрузки документов')
          return
        }

        setDocuments(data || [])
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Неожиданная ошибка')
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [])

  // Установка начальной позиции после загрузки документов
  useEffect(() => {
    if (documents.length > 0 && carouselRef.current) {
      console.log(`Устанавливаем начальную позицию: ${startIndex}`);
      carouselRef.current.style.transform = `translateX(-${startIndex * cardWidth}px)`;
      setCurrentIndex(startIndex);
    }

  }, [documents, startIndex]);

  // Intersection Observer для анимации появления
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

  if (loading) {
    return (
      <section ref={sectionRef} className="py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mx-auto mb-4"></div>
            <div className="h-12 bg-gray-300 rounded w-96 mx-auto mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error || documents.length === 0) {
    return (
      <section ref={sectionRef} className="py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white text-lg">{error || 'Документы не найдены'}</p>
        </div>
      </section>
    )
  }

  return (
    <section
      id="pdf-files"
      ref={sectionRef}
      className="py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden"
    >
      {/* Фоновые эффекты */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Заголовок секции */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Курсы</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-2 mb-6">
            Курсы для
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {" "}самостоятельной работы
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Практические материалы, которые помогут вам развиваться в удобном темпе
          </p>
        </div>

        {/* ИСТИННО БЕСКОНЕЧНАЯ КАРУСЕЛЬ */}
        <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative overflow-hidden group">
            {/* Стрелки управления */}
            <button
              onClick={slideLeft}
              disabled={isTransitioning}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={slideRight}
              disabled={isTransitioning}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-50"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>

            <div className="overflow-hidden">
              <div
                ref={carouselRef}
                className="flex gap-8"
                style={{
                  width: `${infiniteDocuments.length * cardWidth}px`,
                  transform: `translateX(-${startIndex * cardWidth}px)`,
                }}
              >
                {infiniteDocuments.map((doc, index) => (
                  <div
                    key={`${doc.id}-${Math.floor(index / documents.length)}-${index % documents.length}`}
                    className="flex-shrink-0 w-96 transform transition-all duration-300 hover:scale-105"
                  >
                    <DocumentCard
                      document={doc}
                      variant="default"
                      showBuyButton={true}
                      className="h-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка просмотра всех материалов */}
        <div className={`text-center mt-12 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-semibold"
          >
            <Link href="/catalog">
              <Eye className="w-5 h-5 mr-2" />
              Посмотреть все материалы
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
