'use client'

import { useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { StructuredData } from '@/components/seo/StructuredData'
import { Button } from '@/components/ui/button'
import {
  Database,
  Brain,
  Layers,
  TrendingUp,
  ArrowRight,
  Zap,
  Target,
  BarChart3,
  Code,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView, Variants } from 'framer-motion'

const architectureLayers = [
  {
    name: 'Data Layer',
    number: '01',
    icon: Database,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200',
    description: 'Collection and normalization of signals',
    details: [
      'Aggregates minimal necessary user data',
      'Transforms into "energy profile"',
      'Basic characteristics (age, schedule, workload, goals)',
      'Subjective markers (mood, energy, physical state)',
      'Behavioral patterns (decisions, deferred tasks, focus, impulsiveness)',
      'Environmental context (stressors, pressure points, resources)'
    ],
    technical: 'Data passes through a normalizer that algorithmically converts fragmented information into readable parameters: energy levels, cognitive flexibility, stress index, focus index, risk index, etc.'
  },
  {
    name: 'Behavior Engine',
    number: '02',
    icon: Brain,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    description: 'Mathematical model of energy and behavior',
    details: [
      'The core of the system - pure mathematics',
      'Energy Flow Model - predicts daily/weekly energy peaks',
      'Decision Pattern Model - predicts decisions in different states',
      'Friction Mapping Model - identifies energy leaks',
      'All three models work together',
      'Creates personal EnergyGraph (dynamic state map)'
    ],
    models: [
      {
        name: 'Energy Flow Model',
        description: 'Predicts daily and weekly energy peaks using personal activity curves, environmental influence, behavioral cycles, and mood variability'
      },
      {
        name: 'Decision Pattern Model',
        description: 'Predicts decisions based on logical preferences, impulsiveness, stress resilience, risk tendency, and information processing style'
      },
      {
        name: 'Friction Mapping Model',
        description: 'Identifies friction points: procrastination, chaos, overload, lack of structure, incorrect effort distribution'
      }
    ]
  },
  {
    name: 'Strategy OS',
    number: '03',
    icon: Layers,
    color: 'green',
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    description: 'Personal routes and protocols',
    details: [
      'Based on EnergyGraph generates:',
      'Daily Routes - step-by-step trajectories',
      'Protocols - strict action sets for high-risk tasks',
      'Adaptive Recommendations - real-time route adjustments',
      'Long-range Forecasts - weekly/monthly effectiveness predictions'
    ],
    outputs: [
      { title: 'Daily Routes', desc: 'What to do now, later, and what to avoid' },
      { title: 'Protocols', desc: 'For negotiations, conflicts, deadlines, recovery' },
      { title: 'Adaptive Recommendations', desc: 'Real-time state change responses' },
      { title: 'Long-range Forecasts', desc: 'Macro-goal planning support' }
    ]
  }
]

const businessLogic = [
  {
    title: 'High Retention',
    icon: Target,
    description: 'The system becomes a "behavioral assistant" — a daily tool users rely on',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    title: 'Deep Personalization',
    icon: Brain,
    description: 'Unlike fitness trackers and generic AI coaches, EnergyLogic builds a personality model, not just advice',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    title: 'Increasing Accuracy',
    icon: TrendingUp,
    description: 'The more users interact, the more accurate behavior predictions and results become',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    title: 'Economic Scalability',
    icon: BarChart3,
    description: '90% of logic is algorithmic. All three model layers scale without deep individual consultations',
    gradient: 'from-orange-500 to-red-500'
  }
]

const scalingModules = [
  'Career Navigator',
  'Stress-OS',
  'Relationships & Communication',
  'Leadership',
  'Health & Recovery',
  'Finance & Risk Management'
]

export default function InvestorsPage() {
  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.17, 0.67, 0.83, 0.67] as const }
    }
  }

  return (
    <MainLayout>
      <StructuredData
        type="Article"
        data={{
          headline: 'How EnergyLogic Works — Under the Hood',
          description: 'Technical deep dive into EnergyLogic behavioral-cognitive system architecture',
          datePublished: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        }}
      />

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section ref={heroRef} className="relative py-32 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white overflow-hidden">
          {/* Animated grid background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          {/* Floating orbs */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"
              style={{
                left: `${(i * 12.5) % 100}%`,
                top: `${(i * 15) % 100}%`,
              }}
              animate={{
                x: [0, 50, 0],
                y: [0, -30, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 5 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              animate={heroInView ? "visible" : "hidden"}
              variants={containerVariants}
              className="max-w-6xl mx-auto text-center"
            >
              <motion.div variants={itemVariants} className="mb-8">
                <Code className="w-20 h-20 text-cyan-400 mx-auto mb-6" />
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl md:text-7xl font-bold mb-8 leading-tight"
              >
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  How EnergyLogic Works
                </span>
                <br />
                <span className="text-3xl md:text-5xl text-white mt-4 block font-light">
                  Under the Hood
                </span>
              </motion.h1>

              <motion.div
                variants={itemVariants}
                className="max-w-5xl mx-auto space-y-6 text-xl md:text-2xl text-blue-100 leading-relaxed"
              >
                <p>
                  <strong className="text-white">EnergyLogic</strong> is a behavioral-cognitive system using a multi-layered model of human states to predict behavior, select strategies, and enhance user life effectiveness.
                </p>
                <p className="text-lg">
                  The architecture is built as a hybrid of three key levels: <span className="text-cyan-300 font-semibold">Data Layer</span>, <span className="text-purple-300 font-semibold">Behavior Engine</span>, and <span className="text-green-300 font-semibold">Strategy OS</span>.
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <ArrowRight className="w-6 h-6 text-white rotate-90" />
          </motion.div>
        </section>

        {/* Architecture Layers Section */}
        <section className="py-32 bg-gradient-to-b from-white via-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-20"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  System Architecture
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Three integrated layers working together to create personalized life navigation
                </p>
              </motion.div>

              <div className="space-y-32">
                {architectureLayers.map((layer, index) => (
                  <ArchitectureLayerCard
                    key={layer.name}
                    layer={layer}
                    index={index}
                    isReversed={index % 2 === 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Business Logic Section */}
        <section className="py-32 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Why EnergyLogic Works
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Business logic and competitive advantages
              </p>
            </motion.div>

            <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {businessLogic.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 50, rotateY: -15 }}
                  whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group"
                >
                  <div className={`bg-gradient-to-br ${item.gradient} p-0.5 rounded-2xl h-full`}>
                    <div className="bg-white rounded-2xl p-8 h-full flex flex-col">
                      <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center mb-6 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300`}>
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed flex-grow">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Scaling Section */}
        <section className="py-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                                radial-gradient(circle at 80% 80%, white 1px, transparent 1px)`,
              backgroundSize: '100px 100px'
            }}></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-6xl mx-auto"
            >
              <div className="text-center mb-16">
                <Rocket className="w-16 h-16 mx-auto mb-6 text-yellow-300" />
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Future Scaling
                </h2>
                <p className="text-xl text-purple-100 max-w-3xl mx-auto mb-4">
                  EnergyLogic is a platform that can be extended with additional modules:
                </p>
                <p className="text-lg text-purple-200 italic">
                  In perspective — "Human OS" on top of the user's real life
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scalingModules.map((module, index) => (
                  <motion.div
                    key={module}
                    initial={{ opacity: 0, scale: 0.8, rotateX: -90 }}
                    whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                        <Sparkles className="w-6 h-6 text-yellow-300" />
                      </div>
                      <h3 className="text-xl font-semibold">{module}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-gradient-to-br from-gray-900 to-slate-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-cyan-400" />
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Dive Deeper?
              </h2>
              <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-gray-300">
                Let's discuss pilots, funding, data partnerships, and the technical roadmap
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6"
                >
                  <Link href="/contacts">
                    Talk to the Team
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-6"
                >
                  <Link href="/book">
                    Book a Demo
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

function ArchitectureLayerCard({
  layer,
  index,
  isReversed
}: {
  layer: typeof architectureLayers[0],
  index: number,
  isReversed: boolean
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.5, 1, 1, 0.5])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: isReversed ? 100 : -100 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.2 }}
      style={{ opacity }}
      className="relative"
    >
      <div className={`bg-gradient-to-br ${layer.bgGradient} rounded-3xl p-8 md:p-12 border-2 ${layer.borderColor} shadow-2xl relative overflow-hidden group`}>
        {/* Animated background pattern */}
        <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${layer.gradient} opacity-5 rounded-full blur-3xl transform group-hover:scale-150 transition-transform duration-1000`}></div>

        {/* Connection line to next layer */}
        {index < architectureLayers.length - 1 && (
          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 z-0">
            <motion.div
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-1 h-16 bg-gradient-to-b from-gray-300 to-transparent"
            />
          </div>
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className={`w-20 h-20 bg-gradient-to-br ${layer.gradient} rounded-2xl flex items-center justify-center shadow-xl`}
              >
                <layer.icon className="w-10 h-10 text-white" />
              </motion.div>
              <div>
                <div className="text-sm font-semibold text-gray-500 mb-1">
                  {layer.number}
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {layer.name}
                </h3>
                <p className="text-lg text-gray-600 mt-1">
                  {layer.description}
                </p>
              </div>
            </div>
          </div>

          {/* Details List */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {layer.details.map((detail, detailIndex) => (
              <motion.div
                key={detailIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 + detailIndex * 0.05 }}
                className="flex items-start space-x-3"
              >
                <div className={`w-2 h-2 bg-gradient-to-br ${layer.gradient} rounded-full mt-2 flex-shrink-0`}></div>
                <p className="text-gray-700 leading-relaxed">{detail}</p>
              </motion.div>
            ))}
          </div>

          {/* Technical Note */}
          {layer.technical && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 + 0.5 }}
              className={`bg-gradient-to-r ${layer.gradient} bg-opacity-10 border-l-4 rounded-r-xl p-6 mt-8 ${layer.color === 'blue' ? 'border-blue-500' : layer.color === 'purple' ? 'border-purple-500' : 'border-green-500'}`}
            >
              <p className="text-lg text-gray-800 font-medium">
                {layer.technical}
              </p>
            </motion.div>
          )}

          {/* Models for Behavior Engine */}
          {layer.models && (
            <div className="mt-8 space-y-4">
              {layer.models.map((model, modelIndex) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 + modelIndex * 0.2 }}
                  className={`bg-white rounded-xl p-6 border-2 ${layer.borderColor} shadow-lg`}
                >
                  <h4 className={`text-xl font-bold mb-2 bg-gradient-to-r ${layer.gradient} bg-clip-text text-transparent`}>
                    {model.name}
                  </h4>
                  <p className="text-gray-600">{model.description}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Outputs for Strategy OS */}
          {layer.outputs && (
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {layer.outputs.map((output, outputIndex) => (
                <motion.div
                  key={output.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 + outputIndex * 0.1 }}
                  className={`bg-white rounded-xl p-6 border-2 ${layer.borderColor} shadow-lg`}
                >
                  <h4 className={`text-lg font-bold mb-2 bg-gradient-to-r ${layer.gradient} bg-clip-text text-transparent`}>
                    {output.title}
                  </h4>
                  <p className="text-gray-600 text-sm">{output.desc}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
