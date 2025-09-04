'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { CallRequestModal } from '@/components/modals/CallRequestModal'
import { useState } from 'react'

export function Header() {
  const { user, logout } = useAuth()
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <>
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EnergyLogic
              </Link>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Главная
              </Link>
              <Link
                href="/book"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Записаться
              </Link>
              <Link
                href="/catalog"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                PDF-файлы
              </Link>
              <Link
                href="/reviews"
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Отзывы
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCallModalOpen(true)}
                className="border-blue-500 text-blue-600 hover:bg-blue-50 transition-all duration-200"
              >
                Заказать звонок
              </Button>
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <Button
                    size="sm"
                    asChild
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200"
                  >
                    <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
                      Личный кабинет
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-gray-600 hover:text-red-600 transition-colors"
                  >
                    Выйти
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200"
                >
                  <Link href="/auth/login">Личный кабинет</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <CallRequestModal 
        isOpen={isCallModalOpen} 
        onClose={() => setIsCallModalOpen(false)} 
      />
    </>
  )
}
