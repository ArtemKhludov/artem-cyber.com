'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Shield, FileText, RotateCcw, AlertCircle } from 'lucide-react'

export function Legal() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

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

  const legalLinks = [
    {
      icon: Shield,
      title: 'Политика конфиденциальности',
      description: 'Как мы защищаем ваши персональные данные и обеспечиваем безопасность',
      href: '/privacy',
      updated: new Date().toLocaleDateString('ru-RU')
    },
    {
      icon: FileText,
      title: 'Пользовательское соглашение',
      description: 'Условия использования платформы и наших услуг',
      href: '/terms',
      updated: new Date().toLocaleDateString('ru-RU')
    },
    {
      icon: RotateCcw,
      title: 'Условия возврата',
      description: 'Политика возврата средств и гарантии качества услуг',
      href: '/refund',
      updated: new Date().toLocaleDateString('ru-RU')
    },
    {
      icon: AlertCircle,
      title: 'Отказ от ответственности',
      description: 'Важная информация об ограничениях и рисках',
      href: '/disclaimer',
      updated: new Date().toLocaleDateString('ru-RU')
    }
  ]

  const additionalInfo = [
    {
      title: 'Лицензии и сертификаты',
      items: [
        'Лицензия на образовательную деятельность № 123456',
        'Сертификат ISO 27001 (безопасность информации)',
        'Регистрация в Роскомнадзоре',
        'Соответствие GDPR и 152-ФЗ'
      ]
    },
    {
      title: 'Наши гарантии',
      items: [
        '100% конфиденциальность персональных данных',
        'Возврат средств в течение 14 дней',
        'Профессиональная поддержка 24/7',
        'Соблюдение этических стандартов'
      ]
    }
  ]

  return (
    <section ref={sectionRef} className="py-16 bg-gradient-to-b from-gray-50 to-white border-t border-gray-200">
      <div className="container mx-auto px-4">
        {/* Заголовок секции */}
        <div className={`text-center mb-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Правовая информация
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Мы работаем полностью прозрачно и в соответствии с российским
            и международным законодательством
          </p>
        </div>

        {/* Основные документы */}
        <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 transform transition-all duration-1000 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          {legalLinks.map((link, index) => {
            const IconComponent = link.icon
            return (
              <Link
                key={index}
                href={link.href}
                className="group block bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <IconComponent className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {link.description}
                    </p>
                    <div className="text-xs text-gray-500">
                      Обновлено: {link.updated}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Дополнительная информация */}
        <div className={`grid md:grid-cols-2 gap-8 transform transition-all duration-1000 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          {additionalInfo.map((section, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Контактная информация для правовых вопросов */}
        <div className={`mt-12 bg-blue-50 p-6 rounded-xl text-center transform transition-all duration-1000 delay-600 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Вопросы по правовым аспектам?
          </h3>
          <p className="text-gray-600 mb-4">
            Наш юридический отдел готов ответить на любые вопросы,
            связанные с использованием наших услуг
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
            <a
              href="mailto:legal@energylogic.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              legal@energylogic.com
            </a>
            <span className="hidden sm:block text-gray-400">•</span>
            <a
              href="tel:+79991234567"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              +7 (999) 123-45-67 (доб. 2)
            </a>
          </div>
        </div>

        {/* Информация о компании */}
        <div className={`mt-8 text-center text-sm text-gray-500 transform transition-all duration-1000 delay-800 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
          <div className="space-y-2">
            <p>
              ООО &ldquo;ЭнерджиЛоджик&rdquo; • ИНН: 1234567890 • ОГРН: 1234567890123
            </p>
            <p>
              Москва, ул. Примерная, д. 123, офис 456 • Лицензия № 123456 от 01.01.2020
            </p>
            <p className="mt-4 pt-4 border-t border-gray-200">
              Все права защищены © 2024 EnergyLogic.
              Использование материалов сайта возможно только с письменного разрешения правообладателя.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
