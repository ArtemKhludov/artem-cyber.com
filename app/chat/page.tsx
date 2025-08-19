import { MessageCircle, Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/PageLayout'

export const metadata = {
  title: 'Чат с экспертами - EnergyLogic',
  description: 'Получите персональную консультацию от экспертов EnergyLogic через чат',
}

export default function ChatPage() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться на главную
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Чат с экспертами
            </h1>
            <p className="text-lg text-gray-600">
              Получите персональную консультацию от наших экспертов в области энергетической диагностики
            </p>
          </div>

          {/* Chat Interface Placeholder */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Эксперт EnergyLogic</h2>
                  <p className="text-blue-100">Онлайн • Готов к консультации</p>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="h-96 p-6 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Чат будет доступен в ближайшее время
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Мы работаем над интеграцией системы чата. Пока что вы можете заказать звонок или воспользоваться другими способами связи.
                </p>
                
                {/* Alternative Contact Methods */}
                <div className="space-y-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Заказать звонок
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="mailto:energylogic@project.ai">
                      Написать на email
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="tel:+79991234567">
                      Позвонить напрямую
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Chat Input (Disabled) */}
            <div className="p-6 border-t bg-white">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Чат временно недоступен..."
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <Button disabled className="px-6 py-3 bg-gray-300 cursor-not-allowed">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Система чата находится в разработке. Используйте альтернативные способы связи.
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Что можно обсудить в чате?
              </h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Вопросы по документам и материалам</li>
                <li>• Персональные консультации</li>
                <li>• Выбор подходящей программы</li>
                <li>• Техническая поддержка</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Время работы экспертов
              </h3>
              <ul className="text-gray-600 space-y-2">
                <li>• Понедельник - Пятница: 9:00 - 21:00</li>
                <li>• Суббота: 10:00 - 18:00</li>
                <li>• Воскресенье: 12:00 - 17:00</li>
                <li>• Время московское (UTC+3)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
