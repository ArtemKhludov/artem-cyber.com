'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    TrendingUp,
    Clock,
    BookOpen,
    Trophy,
    Star,
    Target,
    Calendar,
    Award
} from 'lucide-react'
import Link from 'next/link'

interface CourseStats {
    id: string
    title: string
    cover_image_url: string
    completion_percentage: number
    last_activity_at: string
    total_materials: number
    completed_materials: number
    total_time_spent: number
}

interface UserSummary {
    total_points: number
    current_level: number
    points_to_next_level: number
    streak_days: number
    courses_started: number
    courses_completed: number
    total_study_time: number
    total_achievements: number
}

interface WeeklyActivity {
    date: string
    day: string
    activities: number
    timeSpent: number
}

interface ProgressOverviewProps {
    className?: string
}

export function ProgressOverview({ className = '' }: ProgressOverviewProps) {
    const [userSummary, setUserSummary] = useState<UserSummary | null>(null)
    const [coursesStats, setCoursesStats] = useState<CourseStats[]>([])
    const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadProgressData()
    }, [])

    const loadProgressData = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/user/stats', {
                credentials: 'include'
            })

            if (response.ok) {
                const data = await response.json()
                setUserSummary(data.userSummary)
                setCoursesStats(data.coursesStats || [])
                setWeeklyActivity(data.analytics?.weeklyActivity || [])
            } else {
                setError('Error loading data')
            }

        } catch (error) {
            console.error('Error loading progress:', error)
            setError('Error loading data')
        } finally {
            setLoading(false)
        }
    }

    const formatStudyTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)

        if (hours > 0) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m`
    }

    const getCompletionColor = (percentage: number) => {
        if (percentage >= 80) return 'from-green-400 to-green-600'
        if (percentage >= 50) return 'from-yellow-400 to-yellow-600'
        if (percentage >= 25) return 'from-orange-400 to-orange-600'
        return 'from-red-400 to-red-600'
    }

    const getStreakMessage = (days: number) => {
        if (days >= 7) return 'Incredible! 🔥'
        if (days >= 3) return 'Excellent! ⭐'
        if (days >= 1) return 'Good! 👍'
        return 'Start a streak!'
    }

    if (loading) {
        return (
            <div className={`space-y-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`text-center py-8 ${className}`}>
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={loadProgressData} variant="outline">
                    Try again
                </Button>
            </div>
        )
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Main Statistics */}
            {userSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3">
                            <Star className="w-8 h-8" />
                            <div>
                                <div className="text-2xl font-bold">{userSummary.total_points}</div>
                                <div className="text-blue-100 text-sm">Points</div>
                            </div>
                        </div>
                        <div className="mt-3 text-sm text-blue-100">
                            Level {userSummary.current_level}
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-8 h-8" />
                            <div>
                                <div className="text-2xl font-bold">{userSummary.courses_completed}</div>
                                <div className="text-green-100 text-sm">Courses completed</div>
                            </div>
                        </div>
                        <div className="mt-3 text-sm text-green-100">
                            out of {userSummary.courses_started} started
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8" />
                            <div>
                                <div className="text-2xl font-bold">{formatStudyTime(userSummary.total_study_time)}</div>
                                <div className="text-orange-100 text-sm">Study time</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-8 h-8" />
                            <div>
                                <div className="text-2xl font-bold">{userSummary.streak_days}</div>
                                <div className="text-purple-100 text-sm">Days in a row</div>
                            </div>
                        </div>
                        <div className="mt-3 text-sm text-purple-100">
                            {getStreakMessage(userSummary.streak_days)}
                        </div>
                    </div>
                </div>
            )}

            {/* Progress to Next Level */}
            {userSummary && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        Progress to Next Level
                    </h3>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">{userSummary.current_level}</div>
                            <div className="text-sm text-gray-500">Current level</div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Progress</span>
                                <span className="text-gray-600">{userSummary.points_to_next_level} points to level {userSummary.current_level + 1}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${((userSummary.total_points % 100) / 100) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">{userSummary.current_level + 1}</div>
                            <div className="text-sm text-gray-500">Next level</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Courses */}
            {coursesStats.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                            Active Courses
                        </h3>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/catalog">All Courses</Link>
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {coursesStats.slice(0, 3).map((course) => (
                            <div key={course.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                {course.cover_image_url && (
                                    <img
                                        src={course.cover_image_url}
                                        alt={course.title}
                                        className="w-16 h-16 rounded-lg object-cover"
                                    />
                                )}
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 mb-1">{course.title}</h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span>{course.completed_materials} of {course.total_materials} materials</span>
                                        <span>{formatStudyTime(course.total_time_spent)}</span>
                                        <span>
                                            Last activity: {new Date(course.last_activity_at).toLocaleDateString('en-US')}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900 mb-1">{course.completion_percentage}%</div>
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`bg-gradient-to-r ${getCompletionColor(course.completion_percentage)} h-2 rounded-full`}
                                            style={{ width: `${course.completion_percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <Button asChild size="sm">
                                    <Link href={`/courses/${course.id}/player`}>Continue</Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Weekly Activity */}
            {weeklyActivity.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-500" />
                        Weekly Activity
                    </h3>

                    <div className="grid grid-cols-7 gap-2">
                        {weeklyActivity.map((day, index) => (
                            <div key={index} className="text-center">
                                <div className="text-xs text-gray-500 mb-1">{day.day}</div>
                                <div className={`w-full h-8 rounded-lg flex items-center justify-center text-xs font-medium ${day.activities > 0
                                    ? 'bg-gradient-to-r from-green-400 to-green-600 text-white'
                                    : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {day.activities > 0 ? day.activities : '0'}
                                </div>
                                {day.timeSpent > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        {Math.floor(day.timeSpent / 60)}m
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Motivational Message */}
            {userSummary && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-500" />
                        Motivation
                    </h3>

                    <div className="text-gray-700">
                        {userSummary.streak_days >= 7 ? (
                            <p>🔥 Incredible! You've been studying for {userSummary.streak_days} days in a row. Keep it up!</p>
                        ) : userSummary.streak_days >= 3 ? (
                            <p>⭐ Great streak! You've been studying for {userSummary.streak_days} days in a row. Just a bit more to a week!</p>
                        ) : userSummary.courses_completed > 0 ? (
                            <p>🎉 Congratulations on completing {userSummary.courses_completed} course(s)! Study more to unlock new achievements.</p>
                        ) : (
                            <p>🚀 Welcome! Start studying courses to earn your first points and achievements.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
