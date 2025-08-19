'use client'

import Link from 'next/link'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'

export function Header() {
  const { user, supabase } = useSupabase()

  const handleSignOut = () => {
    if (supabase?.auth?.signOut) {
      supabase.auth.signOut()
    }
  }

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              EnergyLogic
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Главная
            </Link>
            <Link
              href="/book"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Записаться
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Личный кабинет
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Выйти
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth/login">Войти</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup">Регистрация</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
