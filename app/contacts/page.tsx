'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, MessageCircle, Send, Clock, Users, Globe } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

export default function ContactsPage() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'Здравствуйте! Чем могу помочь?', isUser: false, time: '14:30' }
  ])
  const sectionRef = useRef<HTMLElement>(null)

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
  }

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        text: chatMessage,
        isUser: true,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages([...chatMessages, newMessage])
      setChatMessage('')

      // Имитация ответа менеджера
      setTimeout(() => {
        const managerResponse = {
          id: chatMessages.length + 2,
          text: 'Спасибо за сообщение! Менеджер свяжется с вами в ближайшее время.',
          isUser: false,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        }
        setChatMessages(prev => [...prev, managerResponse])
      }, 2000)
    }
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

  const contactInfo = [
    {
      icon: Phone,
      title: 'Телефон',
      value: '+7 (999) 123-45-67',
      href: 'tel:+79991234567',
      description: 'Звоните в любое время'
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'support@energylogic.com',
      href: 'mailto:support@energylogic.com',
      description: 'Пишите нам на почту'
    },
    {
      icon: MapPin,
      title: 'Адрес',
      value: 'Москва, ул. Примерная, 123',
      href: '#',
      description: 'Наш офис в центре города'
    },
    {
      icon: Clock,
      title: 'Режим работы',
      value: '24/7',
      href: '#',
      description: 'Работаем круглосуточно'
    }
  ]

  const socialLinks = [
    { name: 'Telegram', href: 'https://t.me/energylogic', icon: '🔵', color: 'hover:bg-blue-500' },
    { name: 'VK', href: 'https://vk.com/energylogic', icon: '📘', color: 'hover:bg-blue-600' },
    { name: 'YouTube', href: 'https://youtube.com/@energylogic', icon: '🔴', color: 'hover:bg-red-600' },
    { name: 'Instagram', href: 'https://instagram.com/energylogic', icon: '🟣', color: 'hover:bg-purple-600' }
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
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Контакты
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-12 text-blue-100 leading-relaxed">
                Свяжитесь с нами любым удобным способом<br />
                Мы всегда готовы помочь и ответить на ваши вопросы
              </p>
            </div>
          </div>
        </section>

        {/* Контактная информация */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Контактные данные */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {contactInfo.map((contact, index) => (
                  <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <contact.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{contact.title}</h3>
                    <a
                      href={contact.href}
                      className="text-blue-600 hover:text-blue-700 font-medium block mb-1"
                    >
                      {contact.value}
                    </a>
                    <p className="text-gray-600 text-sm">{contact.description}</p>
                  </div>
                ))}
              </div>

              {/* Основной контент */}
              <div className="grid lg:grid-cols-2 gap-12">
                {/* Форма обратного звонка */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Заказать обратный звонок</h2>
                  <p className="text-gray-600 mb-6">
                    Оставьте свои контакты, и мы перезвоним вам в удобное время
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ваше имя"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Удобное время для звонка</label>
                      <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option>В любое время</option>
                        <option>9:00 - 12:00</option>
                        <option>12:00 - 15:00</option>
                        <option>15:00 - 18:00</option>
                        <option>18:00 - 21:00</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Комментарий</label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="О чем хотите поговорить?"
                      />
                    </div>
                    <Button
                      onClick={handleCallRequest}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    >
                      <Phone className="mr-2 w-4 h-4" />
                      Заказать звонок
                    </Button>
                  </div>
                </div>

                {/* Онлайн чат */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Онлайн чат</h2>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">Онлайн</span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Напишите нам прямо сейчас. Менеджер ответит в течение 2-3 минут
                  </p>

                  {/* Чат окно */}
                  <div className="bg-gray-50 rounded-lg p-4 h-64 mb-4 overflow-y-auto">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`mb-3 ${message.isUser ? 'text-right' : 'text-left'}`}
                      >
                        <div
                          className={`inline-block max-w-xs px-4 py-2 rounded-lg text-sm ${message.isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                            }`}
                        >
                          <p>{message.text}</p>
                          <p className={`text-xs mt-1 ${message.isUser ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                            {message.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Согласие с отказом от ответственности */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="chat-disclaimer"
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="chat-disclaimer" className="text-sm text-gray-700 leading-relaxed">
                        <span className="font-medium text-yellow-800">⚠️ Важно:</span>{' '}
                        Я подтверждаю, что понимаю, что результаты не являются диагнозом, и принимаю ответственность за использование материалов.{' '}
                        <Link href="/disclaimer" className="text-blue-600 hover:underline font-medium">
                          Отказ от ответственности
                        </Link>
                      </label>
                    </div>
                  </div>

                  {/* Поле ввода */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Введите сообщение..."
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Социальные сети */}
              <div className="mt-16 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Мы в социальных сетях</h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Следите за нашими новостями, участвуйте в обсуждениях и получайте полезные материалы
                </p>
                <div className="flex justify-center space-x-4">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 ${social.color}`}
                      title={social.name}
                    >
                      <span className="text-2xl">{social.icon}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Карта */}
              <div className="mt-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Как нас найти</h2>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Интерактивная карта</p>
                      <p className="text-sm text-gray-500">Москва, ул. Примерная, 123</p>
                    </div>
                  </div>
                </div>
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
              Свяжитесь с нами прямо сейчас и получите персональную консультацию
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCallRequest} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Phone className="mr-2 w-4 h-4" />
                Заказать звонок
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/book">
                  <MessageCircle className="mr-2 w-4 h-4" />
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
