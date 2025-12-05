import { Metadata } from 'next'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { generateSEOMetadata } from '@/components/seo/SEOHead'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, Navigation, Target, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = generateSEOMetadata({
    title: 'How EnergyLogic Works: AI Life Navigation System | Step-by-Step Guide',
    description: 'Learn how EnergyLogic AI life navigation system works. Discover how our personal life GPS helps you overcome debt, burnout, and career stagnation in 3 simple steps.',
    keywords: [
        'how AI life navigation works',
        'life navigation system guide',
        'personal life GPS explained',
        'AI recovery path',
        'financial stress recovery',
        'burnout recovery system',
    ],
    canonicalUrl: '/how-it-works',
})

export default function HowItWorksPage() {
    return (
        <MainLayout>
            <StructuredData type="Article" data={{
                headline: 'How EnergyLogic Works: AI Life Navigation System',
                description: 'Step-by-step guide to using EnergyLogic AI-powered life navigation system',
                datePublished: new Date().toISOString(),
                dateModified: new Date().toISOString(),
            }} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                {/* Hero Section */}
                <section className="py-20 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            How EnergyLogic Works: Your Personal Life GPS
                        </h1>
                        <p className="text-xl text-gray-600 mb-8">
                            Our AI-powered life navigation system adapts daily to your situation, building personalized recovery paths from debt, burnout, and career stagnation.
                        </p>
                    </div>
                </section>

                {/* Steps Section */}
                <section className="py-16 px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Step 1 */}
                            <div className="bg-white rounded-lg shadow-lg p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                                    <Target className="w-8 h-8 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                    Step 1: Diagnostic Scan (30 Parameters)
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    Our AI life navigation system analyzes 30 key parameters of your life situation, including financial stress levels, career satisfaction, and personal well-being.
                                </p>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Financial health assessment</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Career and professional analysis</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Burnout and stress evaluation</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Step 2 */}
                            <div className="bg-white rounded-lg shadow-lg p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
                                    <Navigation className="w-8 h-8 text-purple-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                    Step 2: Life Map Creation
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    Based on your diagnostic scan, our personal life GPS creates a detailed map of your current situation and identifies the optimal path forward.
                                </p>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Personalized recovery roadmap</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Priority action items</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Risk and opportunity analysis</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Step 3 */}
                            <div className="bg-white rounded-lg shadow-lg p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                                    <TrendingUp className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                    Step 3: Daily Route Adjustment
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    Your AI life navigation system adapts daily, adjusting your recovery path based on progress, new challenges, and changing circumstances.
                                </p>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Real-time progress tracking</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Adaptive recommendations</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Continuous optimization</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-16 px-4 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                            Why People Choose EnergyLogic Life Navigation System
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    Overcome Debt & Financial Stress
                                </h3>
                                <p className="text-gray-600">
                                    Our AI-powered financial stress management system helps you create a clear path out of debt and financial uncertainty.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    Escape Burnout & Regain Energy
                                </h3>
                                <p className="text-gray-600">
                                    Identify the root causes of burnout and receive personalized strategies to restore your energy and passion.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    Career Guidance & Growth
                                </h3>
                                <p className="text-gray-600">
                                    Get AI-powered career guidance that helps you navigate career transitions and achieve professional growth.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    Life Path Planning
                                </h3>
                                <p className="text-gray-600">
                                    Our life path planning tools help you make informed decisions about your future and stay on track toward your goals.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 px-4">
                    <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-12 text-white">
                        <h2 className="text-3xl font-bold mb-4">
                            Ready to Start Your Recovery Path?
                        </h2>
                        <p className="text-xl mb-8 text-blue-100">
                            Join thousands who have transformed their lives with EnergyLogic AI life navigation system.
                        </p>
                        <Link href="/pricing">
                            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                                View Pricing Plans
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </section>
            </div>
        </MainLayout>
    )
}

