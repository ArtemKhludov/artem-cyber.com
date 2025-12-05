import { Metadata } from 'next'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { generateSEOMetadata } from '@/components/seo/SEOHead'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = generateSEOMetadata({
  title: 'Blog & Insights – EnergyLogic AI Life Navigation System',
  description: 'Insights on AI life navigation, burnout recovery, debt freedom, and career change. US/EN-first content for adults 25–45.',
  keywords: [
    'AI life navigation blog',
    'burnout recovery articles',
    'debt freedom insights',
    'career change guidance',
  ],
  canonicalUrl: '/blog',
})

const posts = [
  {
    title: 'AI Life GPS vs Traditional Coaching',
    category: 'Life Navigation',
    excerpt: 'Why an AI Life Navigation System outperforms static coaching plans for adults 25–45 in the US market.',
    href: '#ai-life-gps-vs-coaching',
    date: '2024-03-12',
  },
  {
    title: 'How AI Can Help You Escape Financial Burnout',
    category: 'Financial Recovery',
    excerpt: 'A playbook for combining debt payoff, income experiments, and burnout prevention in one adaptive route.',
    href: '#financial-burnout',
    date: '2024-02-28',
  },
  {
    title: 'Designing 30/60/90-Day Paths for Career Change',
    category: 'Career Navigation',
    excerpt: 'How to re-route your career with weekly checkpoints and explainable AI recommendations.',
    href: '#career-change',
    date: '2024-02-10',
  },
]

export default function BlogPage() {
  return (
    <MainLayout>
      <StructuredData
        type="BreadcrumbList"
        data={{
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://energylogic-ai.com/' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://energylogic-ai.com/blog' },
          ],
        }}
      />
      <StructuredData
        type="Article"
        data={{
          headline: 'EnergyLogic Blog & Insights',
          description: 'Articles about AI life navigation, burnout recovery, and debt freedom for US/EN adults.',
          datePublished: posts[0].date,
          dateModified: posts[0].date,
        }}
      />

      <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 min-h-screen">
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Blog & Insights: AI Life Navigation System
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              English-first deep-dives on debt recovery, burnout prevention, and career change—built from EnergyLogic data and playbooks.
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {posts.map((post) => (
              <article key={post.title} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <div className="text-sm uppercase tracking-wide text-blue-600 font-semibold mb-2">{post.category}</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">{post.title}</h2>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{new Date(post.date).toLocaleDateString('en-US')}</span>
                  <Link href={post.href} className="inline-flex items-center text-blue-600 hover:text-blue-700">
                    Read Outline
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Want the next deep-dive?</h2>
            <p className="text-xl text-blue-100 mb-8">
              We publish US/EN insights every two weeks. Subscribe or talk to the team about partnerships and guest posts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacts">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
                  Talk to the Team
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Start 30-Day Navigation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
