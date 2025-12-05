import { Metadata } from 'next'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { generateSEOMetadata } from '@/components/seo/SEOHead'
import { Button } from '@/components/ui/button'
import { DollarSign, Flame, Briefcase, Compass, ArrowRight, Shield } from 'lucide-react'

export const metadata: Metadata = generateSEOMetadata({
  title: 'Use Cases – Debt, Burnout, Career Change | EnergyLogic AI Life Navigation',
  description: 'See how the EnergyLogic AI life navigation system helps adults 25–45 escape debt, recover from burnout, and navigate career change with daily AI re-routing.',
  keywords: [
    'AI debt recovery use case',
    'burnout recovery AI',
    'career change navigation',
    'personal life GPS examples',
  ],
  canonicalUrl: '/use-cases',
})

const cases = [
  {
    title: 'Debt & Financial Chaos',
    icon: DollarSign,
    outcome: 'Average 18–26% monthly improvement in cashflow after 30 days.',
    bullets: [
      'Debt payoff map with snowball/avalanche hybrid and guardrails on spending.',
      'Income experiments tuned to risk tolerance and schedule.',
      'Daily alerts for red flags: impulsive buys, missed bills, or mood-driven spending.',
    ],
  },
  {
    title: 'Burnout & Energy Collapse',
    icon: Flame,
    outcome: 'Burnout risk score drops within 21 days via enforced recovery sprints.',
    bullets: [
      'Detects early burnout signals across sleep, calendar, and sentiment.',
      '30/60/90-day rituals: energy shields, meeting triage, dopamine balance.',
      'Emergency rerouting when stress spikes: reset plan, micro-breaks, scripts to say no.',
    ],
  },
  {
    title: 'Career Change & Stagnation',
    icon: Briefcase,
    outcome: 'Clarity on next role in 30 days, transition plan in 90.',
    bullets: [
      'Option stack: stay, pivot, or leap—modeled with payback periods and risk.',
      'Weekly networking and portfolio cadences with templates.',
      'Narrative coaching to translate your story to US/EN recruiters and hiring managers.',
    ],
  },
]

export default function UseCasesPage() {
  return (
    <MainLayout>
      <StructuredData
        type="BreadcrumbList"
        data={{
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://energylogic-ai.com/' },
            { '@type': 'ListItem', position: 2, name: 'Use Cases', item: 'https://energylogic-ai.com/use-cases' },
          ],
        }}
      />
      <StructuredData
        type="Article"
        data={{
          headline: 'Use Cases: Debt, Burnout, Career Change',
          description: 'EnergyLogic AI Life Navigation use cases for US/EN adults 25–45.',
          datePublished: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        }}
      />

      <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 min-h-screen">
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Use Cases: AI Life Navigation for Debt, Burnout, and Career Change
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              EnergyLogic is built for adults 25–45 in the US/EU who need a personal Life GPS to exit debt, recover from burnout, and make confident career moves with daily rerouting.
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

        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {cases.map((item) => (
              <div key={item.title} className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">{item.title}</h2>
                <p className="text-blue-600 font-semibold mb-4">{item.outcome}</p>
                <ul className="space-y-3 text-gray-700">
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">Signals We Watch and Route Around</h2>
              <p className="text-gray-600">
                Debt spikes, stress markers, and career doubts rarely happen alone. EnergyLogic links money, energy, and choices so the AI can re-route you before you stall.
              </p>
              <ul className="space-y-3 text-gray-700">
                <li>• Sentiment + spending anomalies → emergency budget shield</li>
                <li>• Calendar overload + low HRV markers → burnout reroute</li>
                <li>• Recruiter response gaps → adjust narrative and outreach volume</li>
              </ul>
            </div>
            <div className="p-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center space-x-3">
                <Compass className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-semibold">Personal Life GPS</h3>
                  <p className="text-blue-100">Assessment → Life Map → Adaptive route, updated daily.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-semibold">Safety & Compliance</h3>
                  <p className="text-blue-100">US/EU hosting, data encryption, transparent AI rationales.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Briefcase className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-semibold">Built for English First</h3>
                  <p className="text-blue-100">All content, playbooks, and scripts are in US English.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Pick Your Route and Let AI Re-Route Daily</h2>
            <p className="text-xl text-blue-100 mb-8">
              Whether it is debt, burnout, or a career change, EnergyLogic keeps you moving with clear CTAs and measurable outcomes.
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
