'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Brain, Zap, Heart, Target, Users, Award, Shield } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

export default function AboutPage() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
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

  const features = [
    {
      icon: Brain,
      title: '🧠 Психология',
      description: 'Распознавание сценариев, страхов и автоматизмов'
    },
    {
      icon: Zap,
      title: '🧬 Нейронаука',
      description: 'Понимание гормонов и эмоций, управляющих реакциями'
    },
    {
      icon: Heart,
      title: '🤖 ИИ-анализ',
      description: 'Анализ слов, текстов и микро-движений лица'
    },
    {
      icon: Shield,
      title: '🧭 Честность',
      description: 'Беспрецедентная честность как основа изменений'
    }
  ]

  const whatWeDo = [
    'Выявить повторяющиеся сценарии (жертвенность, избегание, страх успеха, ложное «я» и т.д.)',
    'Понять, где ты теряешь энергию и контроль',
    'Принять ключевые решения — не из паники, а из ясности',
    'Получить чёткий план, основанный на тебе, а не на чужой теории'
  ]

  const implementation = [
    '📡 20-минутной голосовой AI-сессии с анализом и PDF-результатом',
    '📅 21-дневного трека, где ИИ отслеживает твоё поведение и мышление, даёт отчёты и гипотезы',
    '📽 медийных материалов (Reels, статьи, презентации), которые вскрывают массовые заблуждения и паттерны'
  ]

  const revolutionPoints = [
    '🤖 ИИ не просто помогает, а диагностирует — в реальном времени, точно и глубже, чем человек',
    '🧬 Мы объединяем эмоции, гормоны, мышление и паттерны в одну карту — фрактальную, живую, обновляемую',
    '💥 Мы не работаем с симптомами — мы вскрываем корень проблемы и сразу даём путь изменения',
    '🚫 Мы не зависим от мнения одного "эксперта", ИИ это как сотни докторов наук во всех сферах одновременно — у нас нет усталости, эго, предвзятости или «мягких ответов»'
  ]

  const forWhom = [
    '🧱 Застрял — в решении, состоянии, жизни',
    '🔁 Видит, что повторяет одни и те же ошибки, но не может вырваться',
    '❌ Устал от чужих советов и «мотивации», которые не работают',
    '🧩 Хочет понять себя глубже, чем позволяли любые книги или психотерапии',
    '⚡️ Готов услышать правду — и сделать из неё действие'
  ]

    return (
    <div className="relative">
      {/* Главное меню */}
      <MainHeader onCallRequest={handleCallRequest} />
      
      {/* Основной контент */}
      <main ref={sectionRef}>
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                О проекте <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">EnergyLogic</span>
              </h1>
              <p className="text-xl md:text-2xl mb-12 text-blue-100 leading-relaxed">
                Мы — EnergyLogic.<br />
                Это новая система самопонимания и внутренней настройки
              </p>
            </div>
          </div>
        </section>

        {/* Основная информация */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Введение */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    Мы объединяем:
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                  {features.map((feature, index) => (
                    <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center mb-12">
                  <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
                    Мы показываем правду — о тебе, твоих паттернах, ошибках, ключевых точках выбора и ресурсах.
                  </p>
                </div>
              </div>

              {/* Что мы делаем */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    🔍 Что мы делаем
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Мы создаём систему самодиагностики и перепрошивки сознания, которая позволяет:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                  {whatWeDo.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                    Это реализовано в виде:
                  </h3>
                  <div className="space-y-4">
                    {implementation.map((item, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-white font-bold text-xs">•</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Почему это революция */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    ⚡️ Почему это — революция
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Потому что впервые в истории:
                  </p>
                </div>

                <div className="space-y-6">
                  {revolutionPoints.map((point, index) => (
                    <div key={index} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                      <p className="text-gray-700 leading-relaxed text-lg">{point}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-12 p-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
                  <p className="text-xl font-semibold">
                    Ни один человек, даже самый опытный, не может дать тебе такую глубину, скорость и структуру, как EnergyLogic.
                  </p>
                </div>
              </div>

              {/* Для кого это */}
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    🧭 Для кого это
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Для тех, кто:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {forWhom.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">•</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Заключение */}
              <div className="text-center p-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  EnergyLogic — это не про «улучшить».
                </h2>
                <p className="text-xl leading-relaxed max-w-3xl mx-auto">
                  Это про вспомнить, кто ты есть — без шума, лжи и страха.<br />
                  И начать жить из этой точки.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Готовы начать свое путешествие к самопознанию?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам людей, которые уже изменили свою жизнь с помощью EnergyLogic
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCallRequest} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Phone className="mr-2 w-4 h-4" />
                Заказать звонок
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/book">
                  <Calendar className="mr-2 w-4 h-4" />
                  Записаться на сессию
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
