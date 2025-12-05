import { Metadata } from 'next'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { generateSEOMetadata } from '@/components/seo/SEOHead'
import { Button } from '@/components/ui/button'
import { ArrowRight, Compass, Brain, ShieldCheck, Activity, LineChart, RefreshCcw } from 'lucide-react'

export const metadata: Metadata = generateSEOMetadata({
  title: 'Product & Features – EnergyLogic AI Life Navigation System',
  description: 'Explore the EnergyLogic AI life navigation system: assessment engine, personal life GPS, burnout and debt recovery paths, daily rerouting, and a unified data model.',
  keywords: [
    'AI Life Navigation features',
    'personal life GPS product',
    'burnout recovery software',
    'financial recovery AI product',
    'life navigation platform',
  ],
  canonicalUrl: '/product',
})

const featureBlocks = [
  {
    icon: Compass,
    title: 'Adaptive Routing Engine',
    copy: 'Daily re-routing that adjusts to your mood, income, spending, and decisions so you always know the next best step.',
  },
  {
    icon: Brain,
    title: 'Behavior & Emotion Model',
    copy: '30-parameter model that connects emotions, hormones, habits, and money choices to reveal the real blockers.',
  },
  {
    icon: LineChart,
    title: 'Financial Recovery',
    copy: 'Debt payoff planner, cashflow guardrails, and income experiments tuned to your risk profile.',
  },
  {
    icon: Activity,
    title: 'Burnout Recovery',
    copy: 'Detects burnout patterns early, prescribes energy rituals, and enforces recovery sprints before you crash.',
  },
  {
    icon: RefreshCcw,
    title: '30/60/90-Day Paths',
    copy: 'Clear milestones for the next 30, 60, and 90 days with weekly checkpoints and recalibration.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy & Safety',
    copy: 'HIPAA-grade encryption, US/EU hosting, and transparent AI explanations for every recommendation.',
  },
]

const pathMilestones = [
  {
    title: 'Day 1–7: Diagnostic & Stabilization',
    details: 'Voice or text intake, risk alerts for debt and burnout, and a basic spending/energy shield.',
  },
  {
    title: 'Day 8–30: Build the Life Map',
    details: 'Personal life GPS that shows leaks of money/energy, priority decisions, and quick wins.',
  },
  {
    title: 'Day 31–60: Growth Loops',
    details: 'Income experiments, career pivot steps, and accountability cadence with daily re-routing.',
  },
  {
    title: 'Day 61–90: Scale & Defend',
    details: 'Long-term automations, relapse prevention, and adding new goals without breaking stability.',
  },
]

export default function ProductPage() {
  return (
    <MainLayout>
      <StructuredData
        type="BreadcrumbList"
        data={{
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://energylogic-ai.com/' },
            { '@type': 'ListItem', position: 2, name: 'Product', item: 'https://energylogic-ai.com/product' },
          ],
        }}
      />
      <StructuredData
        type="Product"
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'EnergyLogic AI Life Navigation System',
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '29.99',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
          description: 'AI Life Navigation System with assessment, life map, and adaptive routing to solve debt, burnout, and career chaos.',
          url: 'https://energylogic-ai.com/product',
        }}
      />

      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Product & Features: AI Life Navigation System for Adults 25–45
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              EnergyLogic is your personal AI Life GPS. Assessment → Life Map → 30/60/90-day path → Daily re-routing that keeps you out of debt, out of burnout, and back in control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  Start 30-Day Navigation
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
              What Powers the EnergyLogic Life Navigation System
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featureBlocks.map((feature) => (
                <div key={feature.title} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              30/60/90-Day Path with Daily Re-Routing
            </h2>
            <p className="text-lg text-gray-600 text-center mb-10">
              Every user gets a personal route with checkpoints and guardrails. The system recalculates daily based on your inputs, energy, and finances.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {pathMilestones.map((item) => (
                <div key={item.title} className="p-6 border border-gray-100 rounded-xl shadow-sm bg-gradient-to-br from-slate-50 to-white">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.details}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">
                Methods, Models, and Data We Already Run
              </h2>
              <p className="text-gray-600">
                EnergyLogic blends cognitive-behavioral prompts, financial scenario planning, burnout risk scoring, and weekly accountability rituals into one adaptive system. It is built for English-speaking adults in the US and EU time zones.
              </p>
              <ul className="space-y-3 text-gray-700">
                <li>• 30-parameter assessment across money, energy, and decision patterns</li>
                <li>• Adaptive scoring for debt payoff velocity, burnout risk, and career optionality</li>
                <li>• Daily nudges with explainable AI rationales you can challenge or accept</li>
                <li>• PDF and dashboard exports for investors, partners, or therapists if needed</li>
              </ul>
            </div>
            <div className="p-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl shadow-xl">
              <h3 className="text-2xl font-bold mb-4">Built for Clarity and Action</h3>
              <p className="text-blue-100 mb-6">
                Think of EnergyLogic as your Life GPS: it scans, maps, and routes you toward financial freedom and burnout recovery—then keeps re-routing when life changes.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-white rounded-full" />
                  <span>Daily route updates and push alerts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-white rounded-full" />
                  <span>Evidence-backed routines for energy and finances</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-white rounded-full" />
                  <span>Clear CTAs: Start 30-Day Navigation or Book a Demo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready for a US-grade AI Life Navigation System?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Start your 30-day navigation or talk to the team about rollout, integrations, and investor pilots.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
                  Start 30-Day Navigation
                </Button>
              </Link>
              <Link href="/contacts">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Talk to the Team
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
