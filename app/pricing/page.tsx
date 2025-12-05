import { Metadata } from 'next'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { generateSEOMetadata } from '@/components/seo/SEOHead'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = generateSEOMetadata({
    title: 'EnergyLogic Pricing Plans | AI Life Navigation System Pricing',
    description: 'Affordable pricing plans for EnergyLogic AI life navigation system. Choose the plan that fits your needs for financial stability, burnout recovery, and career growth.',
    keywords: [
        'EnergyLogic pricing',
        'AI life navigation pricing',
        'life navigation software cost',
        'personal growth platform pricing',
        'financial stress management pricing',
    ],
    canonicalUrl: '/pricing',
})

export default function PricingPage() {
    return (
        <MainLayout>
            <StructuredData type="Product" />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            EnergyLogic Pricing Plans
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Choose the AI life navigation system plan that works for you. All plans include personalized recovery paths, daily route adjustments, and lifetime access to your life map.
                        </p>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        {/* Starter Plan */}
                        <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Starter</h2>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">$9.99</span>
                                <span className="text-gray-600">/month</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Basic diagnostic scan (20 parameters)</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Life map creation</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Weekly route adjustments</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Email support</span>
                                </li>
                            </ul>
                            <Link href="/catalog" className="block">
                                <Button className="w-full" variant="outline">
                                    Get Started
                                </Button>
                            </Link>
                        </div>

                        {/* Professional Plan - Featured */}
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-xl p-8 border-4 border-blue-400 transform scale-105">
                            <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                                MOST POPULAR
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Professional</h2>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">$29.99</span>
                                <span className="text-blue-100">/month</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-white mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-white">Full diagnostic scan (30 parameters)</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-white mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-white">Advanced life map with priority actions</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-white mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-white">Daily route adjustments</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-white mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-white">Priority email & chat support</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-white mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-white">Access to premium courses</span>
                                </li>
                            </ul>
                            <Link href="/catalog" className="block">
                                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">
                                    Get Started
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h2>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">$99.99</span>
                                <span className="text-gray-600">/month</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Everything in Professional</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Custom diagnostic parameters</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Dedicated account manager</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">24/7 priority support</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">Team collaboration features</span>
                                </li>
                            </ul>
                            <Link href="/contacts" className="block">
                                <Button className="w-full" variant="outline">
                                    Contact Sales
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Can I change plans later?
                                </h3>
                                <p className="text-gray-600">
                                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Is there a free trial?
                                </h3>
                                <p className="text-gray-600">
                                    Yes, we offer a 7-day free trial for all plans. No credit card required.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    What payment methods do you accept?
                                </h3>
                                <p className="text-gray-600">
                                    We accept all major credit cards, PayPal, and cryptocurrency via Cryptomus.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Ready to Start Your Recovery Path?
                        </h2>
                        <p className="text-xl text-gray-600 mb-8">
                            Join thousands who have transformed their lives with EnergyLogic.
                        </p>
                        <Link href="/catalog">
                            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                Get Started Today
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}

