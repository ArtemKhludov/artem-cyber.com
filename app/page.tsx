'use client'

import { useState } from 'react'
import { Navbar } from '@/components/home/Navbar'
import { Hero } from '@/components/home/Hero'
import { AboutSection } from '@/components/home/AboutSection'
import { ProductCarousel } from '@/components/home/ProductCarousel'
import { PDFCarousel } from '@/components/home/PDFCarousel'
import { Advantages } from '@/components/home/Advantages'
import { Reviews } from '@/components/home/Reviews'
import { ContactForm } from '@/components/home/ContactForm'
import { Legal } from '@/components/home/Legal'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
  }

  return (
    <div className="relative">
      {/* Главное меню с телефоном и кнопкой заказа звонка */}
      <Navbar onCallRequest={handleCallRequest} />
      
      {/* Основной контент */}
      <main>
        {/* Hero блок */}
        <Hero />
        
        {/* О проекте */}
        <AboutSection onCallRequest={handleCallRequest} />
        
        {/* Карусель программ */}
        <ProductCarousel />
        
        {/* PDF файлы */}
        <PDFCarousel />
        
        {/* Преимущества */}
        <Advantages />
        
        {/* Отзывы */}
        <Reviews />
        
        {/* Форма обратной связи */}
        <ContactForm />
        
        {/* Юридическая информация */}
        <Legal />
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
