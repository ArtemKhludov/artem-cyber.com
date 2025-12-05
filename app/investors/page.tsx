import { Metadata } from 'next'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { generateSEOMetadata } from '@/components/seo/SEOHead'
import { Button } from '@/components/ui/button'
import { BarChart, ShieldCheck, Users, Rocket, ArrowRight, Target } from 'lucide-react'

export const metadata: Metadata = generateSEOMetadata({
  title: 'For Investors | EnergyLogic AI Life Navigation System',
  description: 'Investor overview for EnergyLogic: AI life navigation system focused on US/EN adults 25–45. Market, business model, defensibility, and traction.',
  keywords: [
    'EnergyLogic investors',
    'AI life navigation investment',
    'personal growth SaaS investors',
    'burnout recovery market size',
  ],
  canonicalUrl: '/investors',
})

const pillars = [
  {
    title: 'Market',
    icon: Target,
    content: 'Personal growth + financial wellness + burnout recovery is a $200B+ US/EU market. Adults 25–45 seek AI-first guidance with lower cost than human coaching.',
  },
  {
    title: 'Model',
    icon: BarChart,
    content: 'SaaS subscription ($29–$99/mo) + programs + marketplace for vetted experts. High LTV via ongoing routing and data-driven upsells.',
  },
  {
    title: 'Moat',
    icon: ShieldCheck,
    content: 'Proprietary behavior and routing engine, unified data model across money/energy/career, and longitudinal intent data for US/EN audiences.',
  },
  {
    title: 'Traction',
    icon: Rocket,
    content: '10k+ sessions run, rising US/EN conversion funnels, and partnerships with financial coaches and mental health providers.',
  },
]

export default function InvestorsPage() {
  return (
    <MainLayout>
      <StructuredData
        type="BreadcrumbList"
        data={{
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://energylogic-ai.com/' },
            { '@type': 'ListItem', position: 2, name: 'For Investors', item: 'https://energylogic-ai.com/investors' },
          ],
        }}
      />
      <StructuredData
        type="Article"
        data={{
          headline: 'EnergyLogic Investor Overview',
          description: 'Investor page for EnergyLogic AI Life Navigation System.',
          datePublished: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        }}
      />

      <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 min-h-screen">
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              For Investors: EnergyLogic AI Life Navigation System
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              AI Life GPS for adults 25–45 solving debt, burnout, and career chaos. Built for US/EN market, with SaaS economics and defensible behavior data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacts">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  Talk to the Team
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Product Plans
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <pillar.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">{pillar.title}</h2>
                <p className="text-gray-600">{pillar.content}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">What Makes the Data Valuable</h2>
              <p className="text-gray-600">
                We unify financial, behavioral, and emotional signals into one model. This creates a defensible dataset on intent, resilience, and spending that powers better routing and retention.
              </p>
              <ul className="space-y-3 text-gray-700">
                <li>• Longitudinal behavior data tied to outcomes (debt cleared, burnout avoided)</li>
                <li>• Explainable AI with user-in-the-loop feedback for safer recommendations</li>
                <li>• Marketplace-ready graph of coaches, therapists, and financial partners</li>
              </ul>
            </div>
            <div className="p-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-semibold">Target Segment</h3>
                  <p className="text-blue-100">Adults 25–45, US/EN-first, mid-income professionals with high stress and debt load.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-semibold">Compliance</h3>
                  <p className="text-blue-100">US/EU hosting, Content-Language: en-US, clear opt-ins, and SOC2-ready processes.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Rocket className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-semibold">Go-To-Market</h3>
                  <p className="text-blue-100">US-focused SEO, LinkedIn + Product Hunt footprint, and referral loops with coaches.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Let’s Talk Pilots, Funding, and Data Partnerships</h2>
            <p className="text-xl text-blue-100 mb-8">
              Book time with the founders to review traction dashboards, unit economics, and roadmap for the EnergyLogic AI Life Navigation System.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacts">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
                  Talk to the Team
                </Button>
              </Link>
              <Link href="/book">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
