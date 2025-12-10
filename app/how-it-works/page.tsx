'use client'

import { useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { Button } from '@/components/ui/button'
import { ArrowRight, Compass, TrendingUp, DollarSign, BookOpen, Zap, Navigation, Target, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView, Variants } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Deep Scan: Understanding the Full Picture in 15 Minutes',
    icon: Compass,
    description: 'The system collects only vital data: income, expenses, debts, obligations, goals, energy levels, strengths, skills, stress factors.',
    details: [
      'No endless forms',
      'Personal "life map" created',
      'See where you are now',
      'Identify what\'s holding you back',
      'Discover your strengths',
      'Find realistic paths forward'
    ],
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50'
  },
  {
    number: '02',
    title: 'Smart Route: Personal 30/60/90 Day Plan',
    icon: Navigation,
    description: 'AI builds an individual route — like GPS, but for life:',
    details: [
      'Steps for money management',
      'Steps for professional growth',
      'Steps for energy and wellbeing',
      'Steps to get out of debt',
      'Steps to transition to new job or field'
    ],
    note: 'Each point is simple, clear, and actionable.',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50'
  },
  {
    number: '03',
    title: 'Money System: Manage Finances Without Pain',
    icon: DollarSign,
    description: 'ENERGYLogic analyzes spending, notices leaks, gives specific recommendations, creates budgets, and helps escape the debt trap.',
    details: [
      'Automatic expense tracking',
      'Identifies money leaks',
      'Personal budget creation',
      'Debt payoff strategies',
      'Cash flow optimization'
    ],
    note: 'You don\'t get "generic internet advice." You get a personal strategy.',
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-50 to-emerald-50'
  },
  {
    number: '04',
    title: 'Skill Path: Building a New Career or Income',
    icon: BookOpen,
    description: 'AI finds real career options, selects courses, gathers free alternatives, and proposes a step-by-step roadmap:',
    details: [
      'From "I don\'t know where to start"',
      'To "I\'m in the process and seeing results"',
      'Career matching based on your strengths',
      'Course recommendations (free & paid)',
      'Learning path optimization'
    ],
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-50 to-red-50'
  },
  {
    number: '05',
    title: 'Energy Engine: Resource Recovery',
    icon: Zap,
    description: 'Psychological techniques, guidance, breathing exercises, day structuring, anxiety breakdown, stress management — all tailored to your real life.',
    details: [
      'Psychological techniques',
      'Breathing exercises',
      'Day structuring',
      'Anxiety management',
      'Stress reduction strategies'
    ],
    note: 'When your mind is calm — decisions come easier.',
    gradient: 'from-yellow-500 to-amber-500',
    bgGradient: 'from-yellow-50 to-amber-50'
  },
  {
    number: '06',
    title: 'Real-Time Guidance: Your Personal Navigator',
    icon: Target,
    description: 'Every day — small route adjustments, just like GPS:',
    details: [
      '"Here you can save money"',
      '"Here you should take a pause"',
      '"This would be a good step today"',
      'Notices when you\'re off track',
      'Gently redirects you back'
    ],
    note: 'ENERGYLogic notices when you\'ve veered off and gently returns you to the route.',
    gradient: 'from-indigo-500 to-blue-500',
    bgGradient: 'from-indigo-50 to-blue-50'
  },
  {
    number: '07',
    title: 'Long-Term Growth: Path Upward, Not Just Survival',
    icon: TrendingUp,
    description: 'After 2–3 months, you gain:',
    details: [
      'Stability',
      'Clarity',
      'Control',
      'Financial plan',
      'New skills',
      'Structure',
      'Inner foundation'
    ],
    note: 'ENERGYLogic makes the path not only possible, but safe.',
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-50 to-purple-50'
  }
]

export default function HowItWorksPage() {
  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 })

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.17, 0.67, 0.83, 0.67] as const }
    }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  return (
    <MainLayout>
      <StructuredData type="Article" data={{
        headline: 'How EnergyLogic Works: Your Personal Life GPS',
        description: 'Step-by-step guide to using EnergyLogic AI-powered life navigation system',
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      }} />

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section ref={heroRef} className="relative py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              animate={heroInView ? "visible" : "hidden"}
              variants={staggerContainer}
              className="max-w-5xl mx-auto text-center"
            >
              <motion.div variants={fadeInUp} className="mb-8">
                <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-5xl md:text-7xl font-bold mb-8 leading-tight"
              >
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  How EnergyLogic Works
                </span>
                <br />
                <span className="text-3xl md:text-5xl text-white mt-4 block font-light">
                  Your Personal Life GPS
                </span>
              </motion.h1>

              <motion.div
                variants={fadeInUp}
                className="max-w-4xl mx-auto space-y-6 text-xl md:text-2xl text-blue-100 leading-relaxed"
              >
                <p>
                  <strong className="text-white">ENERGYLogic</strong> is a system that takes your current life as point A and builds a clear, honest, and realistic route to point B.
                </p>
                <p>
                  Without chaos. Without empty words. Without pressure.
                </p>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center text-xl font-semibold"
              >
                <div className="px-8 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  This is not motivation.
                </div>
                <ArrowRight className="w-6 h-6 text-yellow-400" />
                <div className="px-8 py-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-xl border border-white/20">
                  This is navigation.
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-32 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
                className="space-y-32"
              >
                {steps.map((step, index) => (
                  <StepCard key={index} step={step} index={index} />
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-blue-100">
                Let ENERGYLogic guide you from chaos to control
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6"
                >
                  <Link href="/book">
                    Start Your Path
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6"
                >
                  <Link href="/catalog">
                    Browse Programs
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}

function StepCard({ step, index }: { step: typeof steps[0], index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 0.3])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 80 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      style={{ opacity, scale }}
      className="relative group"
    >
      <div className={`bg-gradient-to-br ${step.bgGradient} rounded-3xl p-8 md:p-12 border border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden`}>
        {/* Decorative background element */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${step.gradient} opacity-10 rounded-full blur-3xl transform group-hover:scale-150 transition-transform duration-700`}></div>

        <div className="relative z-10">
          {/* Step number and icon */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center space-x-6">
              <div className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-300`}>
                <step.icon className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="text-6xl md:text-8xl font-bold text-gray-200/30 mb-2">
                  {step.number}
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Details list */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {step.details.map((detail, detailIndex) => (
              <motion.div
                key={detailIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 + detailIndex * 0.1 }}
                className="flex items-start space-x-3 group/item"
              >
                <div className={`w-6 h-6 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center flex-shrink-0 mt-1 group-hover/item:scale-125 transition-transform duration-300`}>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-700 leading-relaxed flex-1">{detail}</p>
              </motion.div>
            ))}
          </div>

          {/* Note */}
          {step.note && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 + 0.5 }}
              className={`bg-gradient-to-r ${step.gradient} bg-opacity-10 border-l-4 border-opacity-50 rounded-r-xl p-6 mt-8`}
              style={{ borderLeftColor: `var(--${step.gradient.split('-')[1]}-500)` }}
            >
              <p className="text-lg text-gray-800 font-medium italic">
                {step.note}
              </p>
            </motion.div>
          )}

          {/* Decorative arrow */}
          {index < steps.length - 1 && (
            <div className="flex justify-center mt-12">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-12 h-12 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center`}
              >
                <ArrowRight className="w-6 h-6 text-white rotate-90" />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
