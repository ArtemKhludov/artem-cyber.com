'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ShoppingBag, ChevronRight, Sparkles } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'

export default function NotFound() {
  const [isVisible, setIsVisible] = useState(false)
  const [isBlinking, setIsBlinking] = useState(true)

  useEffect(() => {
    setIsVisible(true)

    // Управление миганием
    const blinkInterval = setInterval(() => {
      setIsBlinking(prev => !prev)
    }, 800)

    return () => clearInterval(blinkInterval)
  }, [])

  return (
    <PageLayout>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Энергетический фон - такой же как на главной */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
          {/* Звездный эффект */}
          <div className="absolute inset-0">
            {[...Array(80)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          {/* Энергетические волны */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-3/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
          </div>

          {/* Градиентный оверлей */}
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Контент */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className={`transform transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            {/* 404 */}
            <div className="mb-8">
              <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4">
                404
              </h1>
            </div>

            {/* Мигающая надпись */}
            <div className={`mb-12 transition-opacity duration-300 ${
              isBlinking ? 'opacity-100' : 'opacity-60'
            }`}>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-400 animate-spin" />
                Наши разработчики уже летят к тебе
                <Sparkles className="w-8 h-8 text-yellow-400 animate-spin" />
              </h2>
              <p className="text-xl text-blue-200 max-w-2xl mx-auto">
                Эта страница попала в другое измерение, но мы её вернём!
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button 
                asChild 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 border-2 border-white/20"
              >
                <Link href="/" className="flex items-center gap-3">
                  <Home className="w-5 h-5" />
                  На главную
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button 
                asChild 
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
              >
                <Link href="/catalog" className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5" />
                  В каталог
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Анимация разработчиков внизу */}
            <div className="relative">
              <div className="flex justify-center items-center space-x-4">
                {/* Космический корабль */}
                <div className="animate-bounce">
                  <div className="text-4xl">🚀</div>
                </div>
                
                {/* Звёздочки */}
                <div className="flex space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className="text-yellow-400 animate-pulse"
                      style={{ 
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: '1s' 
                      }}
                    >
                      ✨
                    </div>
                  ))}
                </div>

                {/* Разработчик */}
                <div className="animate-bounce" style={{ animationDelay: '0.5s' }}>
                  <div className="text-4xl">👨‍💻</div>
                </div>
              </div>
              
              <p className="text-blue-200 mt-4 text-sm animate-pulse">
                Скорость полёта: 299,792,458 м/с (скорость света) ⚡
              </p>
            </div>
          </div>
        </div>

        {/* Дополнительные плавающие элементы */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white/10 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
                fontSize: `${12 + Math.random() * 20}px`
              }}
            >
              ⭐
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </PageLayout>
  )
}
