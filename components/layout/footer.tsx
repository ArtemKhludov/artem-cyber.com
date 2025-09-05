'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Send } from 'lucide-react'

export function Footer() {

  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Логотип и описание */}
          <div className="lg:col-span-2">
            <Link href="/" className="text-3xl font-bold text-blue-400 mb-4 block">
              Energy<span className="text-white">Logic</span>
            </Link>
            <p className="text-gray-300 max-w-md mb-6 leading-relaxed">
              Революционная платформа для глубокой трансформации личности.
              Используем ИИ и передовые технологии для анализа и изменения жизни.
            </p>

            {/* Контактная информация */}
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Phone className="w-4 h-4 mr-3 text-blue-400" />
                <a href="tel:+79991234567" className="hover:text-white transition-colors">
                  +7 (999) 123-45-67
                </a>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="w-4 h-4 mr-3 text-blue-400" />
                <a href="mailto:support@energylogic.com" className="hover:text-white transition-colors">
                  support@energylogic.com
                </a>
              </div>
              <div className="flex items-start text-gray-300">
                <MapPin className="w-4 h-4 mr-3 text-blue-400 mt-0.5" />
                <span>Москва, ул. Примерная, 123</span>
              </div>
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Навигация</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  О проекте
                </Link>
              </li>
              <li>
                <Link
                  href="/book"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  Программы
                </Link>
              </li>
              <li>
                <Link
                  href="/catalog"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  PDF-файлы
                </Link>
              </li>
              <li>
                <Link
                  href="/reviews"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  Отзывы
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left"
                >
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          {/* Услуги и поддержка */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Услуги</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/book" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Записаться на сессию
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Купить программу
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Центр поддержки
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Частые вопросы
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-blue-400 transition-colors">
                  Блог
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Социальные сети */}
        <div className="border-t border-gray-800 pt-8 mt-12">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <div className="mb-6 lg:mb-0">
              <h4 className="text-lg font-semibold text-white mb-4">Следите за нами</h4>
              <div className="flex space-x-4">
                {[
                  { name: 'Telegram', href: 'https://t.me/energylogic', icon: '🔵', color: 'hover:bg-blue-500' },
                  { name: 'VK', href: 'https://vk.com/energylogic', icon: '📘', color: 'hover:bg-blue-600' },
                  { name: 'YouTube', href: 'https://youtube.com/@energylogic', icon: '🔴', color: 'hover:bg-red-600' },
                  { name: 'Instagram', href: 'https://instagram.com/energylogic', icon: '🟣', color: 'hover:bg-purple-600' }
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 ${social.color}`}
                    title={social.name}
                  >
                    <span className="text-lg">{social.icon}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Подписка на новости */}
            <div className="w-full lg:w-auto">
              <h4 className="text-lg font-semibold text-white mb-4 text-center lg:text-left">
                Подпишитесь на новости
              </h4>
              <div className="flex max-w-md mx-auto lg:mx-0">
                <input
                  type="email"
                  placeholder="Ваш email"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-l-none">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center lg:text-left">
                Получайте новости о новых программах и скидках
              </p>
            </div>
          </div>
        </div>

        {/* Юридическая информация */}
        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="text-center lg:text-left">
              <p className="text-gray-400 text-sm">
                © 2024 EnergyLogic. Все права защищены.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                ООО &ldquo;ЭнерджиЛоджик&rdquo; • ИНН: 1234567890 • ОГРН: 1234567890123
              </p>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-end space-x-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Конфиденциальность
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Условия использования
              </Link>
              <Link href="/refund" className="text-gray-400 hover:text-white transition-colors">
                Возврат средств
              </Link>
              <Link href="/disclaimer" className="text-gray-400 hover:text-white transition-colors">
                Отказ от ответственности
              </Link>
              <Link href="/sitemap" className="text-gray-400 hover:text-white transition-colors">
                Карта сайта
              </Link>
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl mb-2">🔒</div>
              <h5 className="font-semibold text-white mb-1">Безопасность</h5>
              <p className="text-xs text-gray-400">SSL-шифрование и защита данных</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl mb-2">🏆</div>
              <h5 className="font-semibold text-white mb-1">Качество</h5>
              <p className="text-xs text-gray-400">Сертифицированные специалисты</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h5 className="font-semibold text-white mb-1">Инновации</h5>
              <p className="text-xs text-gray-400">Передовые ИИ-технологии</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
