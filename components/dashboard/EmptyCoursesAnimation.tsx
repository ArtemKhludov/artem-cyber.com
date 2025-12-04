'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Sparkles, Star, Zap, TreePine, Sun } from 'lucide-react'

export function EmptyCoursesAnimation() {
    const [animationPhase, setAnimationPhase] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationPhase(prev => (prev + 1) % 4)
        }, 2000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative min-h-[400px] flex items-center justify-center overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl"></div>

            {/* Animated tree of life */}
            <div className="relative z-10 text-center">
                {/* Tree trunk */}
                <div className="w-4 h-32 bg-gradient-to-t from-amber-800 to-amber-600 mx-auto rounded-full relative">
                    {/* Tree branches */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full opacity-80 animate-pulse"></div>
                    </div>
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-300 to-green-500 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-200 to-green-400 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                </div>

                {/* Light rays */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-32 bg-gradient-to-t from-yellow-400 to-transparent opacity-60 animate-pulse"
                            style={{
                                transform: `rotate(${i * 45}deg)`,
                                transformOrigin: 'bottom center',
                                left: '50%',
                                bottom: '50%',
                                animationDelay: `${i * 0.2}s`,
                                animationDuration: '2s'
                            }}
                        ></div>
                    ))}
                </div>

                {/* Floating particles */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce"
                            style={{
                                left: `${20 + (i * 5)}%`,
                                top: `${30 + (i * 3)}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: '3s'
                            }}
                        ></div>
                    ))}
                </div>

                {/* Main content */}
                <div className="relative z-20 mt-8">
                    <div className="flex items-center justify-center mb-4">
                        <BookOpen className="w-12 h-12 text-blue-600 animate-pulse" />
                        <Sparkles className="w-8 h-8 text-yellow-500 animate-bounce ml-2" />
                    </div>

                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                        The Tree of Knowledge Awaits You!
                    </h3>

                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Start your journey to new knowledge. Each course is a new leaf on your tree of wisdom.
                    </p>

                    {/* Animated call-to-action */}
                    <div className="relative">
                        <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                            <div className="flex items-center">
                                <Zap className="w-5 h-5 mr-2 animate-pulse" />
                                Choose Your First Course
                                <Star className="w-5 h-5 ml-2 animate-spin" style={{ animationDuration: '3s' }} />
                            </div>
                        </button>

                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-30 animate-pulse"></div>
                    </div>

                    {/* Progress indicators */}
                    <div className="flex justify-center space-x-2 mt-6">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all duration-500 ${animationPhase === i
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 scale-125'
                                        : 'bg-gray-300'
                                    }`}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating icons */}
            <div className="absolute inset-0 pointer-events-none">
                <TreePine className="absolute top-10 left-10 w-6 h-6 text-green-500 animate-bounce opacity-60" style={{ animationDelay: '0.5s' }} />
                <Sun className="absolute top-20 right-16 w-8 h-8 text-yellow-500 animate-spin opacity-40" style={{ animationDuration: '8s' }} />
                <Sparkles className="absolute bottom-20 left-16 w-5 h-5 text-purple-500 animate-pulse opacity-50" style={{ animationDelay: '1s' }} />
                <Star className="absolute bottom-32 right-20 w-4 h-4 text-pink-500 animate-bounce opacity-60" style={{ animationDelay: '1.5s' }} />
            </div>
        </div>
    )
}
