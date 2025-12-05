'use client'

import { cn } from '@/lib/utils'
import {
  ShoppingBag,
  BookOpen,
  Trophy,
  Gift,
  MessageSquare,
  History,
  Monitor,
  Home
} from 'lucide-react'

interface SidebarNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navigationItems = [
  {
    id: 'purchases',
    label: 'My Purchases',
    icon: ShoppingBag,
    description: 'Your purchases'
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: BookOpen,
    description: 'Available courses'
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Trophy,
    description: 'Your rewards'
  },
  {
    id: 'gifts',
    label: 'Gifts',
    icon: Gift,
    description: 'Bonuses and gifts'
  },
  {
    id: 'recent',
    label: 'Recently Viewed',
    icon: History,
    description: 'Activity history'
  },
  {
    id: 'sessions',
    label: 'Active Sessions',
    icon: Monitor,
    description: 'Your devices'
  },
  {
    id: 'issues',
    label: 'Issues',
    icon: MessageSquare,
    description: 'Support'
  }
]

export function SidebarNavigation({ activeTab, onTabChange }: SidebarNavigationProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Home className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Personal Dashboard</h2>
            <p className="text-xs text-gray-500">Welcome!</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200',
                'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive ? 'text-blue-600' : 'text-gray-400'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'font-medium text-sm',
                  isActive ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {item.label}
                </div>
                <div className={cn(
                  'text-xs mt-0.5',
                  isActive ? 'text-blue-600' : 'text-gray-500'
                )}>
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          EnergyLogic Platform
        </div>
      </div>
    </div>
  )
}
