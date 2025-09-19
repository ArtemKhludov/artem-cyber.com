'use client'

import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import {
    Trophy,
    Star,
    Award,
    Target,
    Flame,
    Crown,
    Zap,
    CheckCircle,
    Clock,
    TrendingUp
} from 'lucide-react'

interface Achievement {
    id: string
    achievement_type: string
    achievement_title: string
    achievement_description: string
    points_awarded: number
    icon: string
    earned_at: string
}

interface UserPoints {
    total_points: number
    current_level: number
    points_to_next_level: number
    streak_days: number
    courses_started: number
    courses_completed: number
    total_study_time: number
    total_achievements: number
}

interface AchievementsPanelProps {
    className?: string
}

export function AchievementsPanel({ className = '' }: AchievementsPanelProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadAchievements()
    }, [])

    const loadAchievements = async () => {
        try {
            setLoading(true)
            setError(null)

            // Загружаем достижения
            const achievementsResponse = await fetch('/api/achievements', {
                credentials: 'include'
            })

            if (achievementsResponse.ok) {
                const achievementsData = await achievementsResponse.json()
                setAchievements(achievementsData.achievements || [])
            }

            // Загружаем статистику пользователя
            const statsResponse = await fetch('/api/user/stats', {
                credentials: 'include'
            })

            if (statsResponse.ok) {
                const statsData = await statsResponse.json()
                setUserPoints(statsData.userSummary)
            }

        } catch (error) {
            console.error('Ошибка загрузки достижений:', error)
            setError('Ошибка загрузки данных')
        } finally {
            setLoading(false)
        }
    }

    const getAchievementIcon = (icon: string) => {
        const iconMap: Record<string, ReactElement> = {
            '🎯': <Target className="w-6 h-6 text-blue-500" />,
            '🏆': <Trophy className="w-6 h-6 text-yellow-500" />,
            '🔥': <Flame className="w-6 h-6 text-red-500" />,
            '⭐': <Star className="w-6 h-6 text-yellow-400" />,
            '👑': <Crown className="w-6 h-6 text-purple-500" />,
            '⚡': <Zap className="w-6 h-6 text-orange-500" />
        }
        return iconMap[icon] || <Award className="w-6 h-6 text-gray-500" />
    }

    const getAchievementColor = (type: string) => {
        const colorMap: { [key: string]: string } = {
            'first_material_completed': 'from-blue-400 to-blue-600',
            'course_completed': 'from-yellow-400 to-yellow-600',
            'streak_3_days': 'from-orange-400 to-orange-600',
            'streak_7_days': 'from-red-400 to-red-600',
            'level_up': 'from-purple-400 to-purple-600'
        }
        return colorMap[type] || 'from-gray-400 to-gray-600'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatStudyTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        
        if (hours > 0) {
            return `${hours}ч ${minutes}м`
        }
        return `${minutes}м`
    }

    if (loading) {
        return (
            <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-200 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-200 ${className}`}>
                <div className="text-center text-red-500">
                    <p>{error}</p>
                    <Button 
                        onClick={loadAchievements}
                        variant="outline"
                        className="mt-2"
                    >
                        Попробовать снова
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Статистика пользователя */}
            {userPoints && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Ваша статистика
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-yellow-600">{userPoints.total_points}</div>
                            <div className="text-xs text-gray-500">Баллов</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600">{userPoints.current_level}</div>
                            <div className="text-xs text-gray-500">Уровень</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-green-600">{userPoints.courses_completed}</div>
                            <div className="text-xs text-gray-500">Курсов завершено</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-orange-600">{userPoints.streak_days}</div>
                            <div className="text-xs text-gray-500">Дней подряд</div>
                        </div>
                    </div>

                    {/* Прогресс до следующего уровня */}
                    <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">До следующего уровня</span>
                            <span className="text-gray-600">{userPoints.points_to_next_level} баллов</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${((userPoints.total_points % 100) / 100) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="text-center text-sm text-gray-600">
                        Время изучения: {formatStudyTime(userPoints.total_study_time)}
                    </div>
                </div>
            )}

            {/* Достижения */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Достижения ({achievements.length})
                </h3>

                {achievements.length === 0 ? (
                    <div className="text-center py-8">
                        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">У вас пока нет достижений</p>
                        <p className="text-sm text-gray-400">Начните изучать курсы, чтобы получить первые награды!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {achievements.map((achievement) => (
                            <div 
                                key={achievement.id}
                                className={`bg-gradient-to-r ${getAchievementColor(achievement.achievement_type)} rounded-lg p-4 text-white`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        {getAchievementIcon(achievement.icon)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold">{achievement.achievement_title}</h4>
                                            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                                                +{achievement.points_awarded}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/90 mb-2">
                                            {achievement.achievement_description}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-white/70">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>Получено {formatDate(achievement.earned_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Мотивационные элементы */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-green-500" />
                    Мотивация
                </h3>
                
                <div className="space-y-3">
                    {userPoints && (
                        <>
                            {userPoints.streak_days >= 3 && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">Отличная серия!</p>
                                        <p className="text-sm text-gray-600">
                                            Вы занимаетесь {userPoints.streak_days} дней подряд
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {userPoints.courses_completed > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">Поздравляем!</p>
                                        <p className="text-sm text-gray-600">
                                            Вы завершили {userPoints.courses_completed} курс(ов)
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                                <Target className="w-5 h-5 text-blue-500" />
                                <div>
                                    <p className="font-medium text-gray-900">Продолжайте в том же духе!</p>
                                    <p className="text-sm text-gray-600">
                                        Каждый изученный материал приближает вас к цели
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
