'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, ArrowRight, Shield, Navigation, Sparkles, Heart, Target, Compass } from 'lucide-react'
import Link from 'next/link'
import { MainHeader } from '@/components/layout/MainHeader'
import { Footer } from '@/components/layout/footer'
import { CallRequestModal } from '@/components/modals/CallRequestModal'
import { motion, useScroll, useTransform, useInView, Variants } from 'framer-motion'

export default function MissionPage() {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])

  const handleCallRequest = () => {
    setIsCallModalOpen(true)
  }

  const handleCloseCallModal = () => {
    setIsCallModalOpen(false)
  }

  // Animation variants
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.17, 0.67, 0.83, 0.67] as const } }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const whoWeHelp = [
    {
      icon: Shield,
      title: 'The Abandoned Strong',
      description: 'People 25–40 who look fine from the outside, but are drowning in debt, burnout, and emotional exhaustion.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Navigation,
      title: 'No Support System',
      description: 'Not protected by government programs, family support, or social services. Told to "just figure it out" because they\'re "strong enough".',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Heart,
      title: 'The Exhausted Leaders',
      description: 'Those who naturally carry responsibility, work hard, try to be useful — but hide their exhaustion because it feels wrong to admit struggle.',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: Compass,
      title: 'Invisible Vulnerability',
      description: 'Not disabled, not minorities, not visible "victims" — so no one protects them. But they\'re drowning in obligations, burnout, career changes, and shame.',
      gradient: 'from-green-500 to-teal-500'
    }
  ]

  const painPoints = [
    'Tired of the debt–stress–work cycle with no way out',
    'Lost energy, direction, and don\'t know what to do next',
    'Want to change careers but don\'t know where to start',
    'Working at full capacity but still not making ends meet',
    'Carrying everything alone, and it\'s destroying from within'
  ]

  const whatWeGive = [
    {
      title: 'Financial Tracking',
      description: 'Expenses, debts, obligations, automatic analysis of unnecessary spending',
      icon: '💰'
    },
    {
      title: 'Exit Plan',
      description: '30/60/90 day steps, but flexible and adaptable to your life',
      icon: '📋'
    },
    {
      title: 'Psychological Support',
      description: 'State analysis, guidance, techniques to restore energy',
      icon: '🧠'
    },
    {
      title: 'Career Navigation',
      description: 'Based on your strengths, experience, education, and goals',
      icon: '🎯'
    },
    {
      title: 'Learning Paths',
      description: 'Smart search for courses, training, grants, and hidden opportunities',
      icon: '📚'
    },
    {
      title: 'Clear Action Steps',
      description: 'Complex solutions explained simply, in the language of action, not empty advice',
      icon: '⚡'
    }
  ]

  const whyImportant = [
    'Because the strong fall too',
    'But they have the hardest time asking for help',
    'Because they deserve a system, not empty motivation',
    'Because someone finally needs to see them'
  ]

  return (
    <div className="relative min-h-screen bg-white">
      <MainHeader onCallRequest={handleCallRequest} />

      <main>
        {/* Hero Section with Parallax */}
        <motion.section
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900"
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(50)].map((_, i) => (
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

          <div className="relative z-10 container mx-auto px-4 text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="max-w-5xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="inline-block mb-8"
              >
                <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              </motion.div>

              <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Our Mission
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="text-2xl md:text-3xl mb-6 text-blue-100 font-light leading-relaxed"
              >
                We create a system that helps strong people recover, take control, and build a new path
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
                className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
              >
                Honestly. Structurally. Without empty words.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="mt-12 flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button
                  onClick={handleCallRequest}
                  size="lg"
                  className="bg-white text-blue-900 hover:bg-gray-100 text-lg px-8 py-6"
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Start Your Journey
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-900 text-lg px-8 py-6"
                >
                  <Link href="/book">
                    <Calendar className="mr-2 w-5 h-5" />
                    Book a Session
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white/70"
            >
              <ArrowRight className="w-6 h-6 rotate-90" />
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Who We Help Section */}
        <section className="py-32 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="max-w-6xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="text-center mb-20">
                <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                  Who We <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Help</span>
                </h2>
                <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  ENERGYLogic was created for people who are used to working, providing for their family, taking responsibility, and not complaining.
                </p>
              </motion.div>

              <motion.p
                variants={fadeInUp}
                className="text-lg md:text-xl text-gray-700 text-center max-w-4xl mx-auto mb-16 leading-relaxed"
              >
                That&apos;s exactly why when they burn out, lose income, drown in debt, or find themselves at a crossroads — <strong className="text-gray-900">no one is there</strong>.
              </motion.p>

              <div className="grid md:grid-cols-2 gap-8 mb-16">
                {whoWeHelp.map((item, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="relative group"
                  >
                    <div className="relative h-full p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                      {/* Gradient background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                      <div className="relative z-10">
                        <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform duration-300`}>
                          <item.icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                variants={fadeInUp}
                className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-8 rounded-xl mb-12"
              >
                <p className="text-lg md:text-xl text-gray-800 leading-relaxed">
                  <strong className="text-gray-900">The state helps the weak.</strong> Friends say: &quot;hang in there, you&apos;ll make it.&quot;
                </p>
                <p className="text-lg md:text-xl text-gray-800 mt-4 leading-relaxed">
                  <strong className="text-gray-900">But a strong person, when they&apos;re struggling, is left alone.</strong>
                </p>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="mb-12"
              >
                <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">These are people who:</h3>
                <div className="space-y-4">
                  {painPoints.map((point, index) => (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      whileHover={{ x: 10 }}
                      className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <p className="text-lg text-gray-700 leading-relaxed">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* What We Give Section */}
        <section className="py-32 bg-gradient-to-b from-white via-blue-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="max-w-6xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="text-center mb-20">
                <Target className="w-16 h-16 text-blue-600 mx-auto mb-6" />
                <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                  What We <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Give</span>
                </h2>
                <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  ENERGYLogic is a digital assistant that creates structure, direction, and a controlled path upward for each person.
                </p>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-6 leading-relaxed">
                  The system adapts to every life and every problem.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                {whatWeGive.map((item, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    whileHover={{ scale: 1.05, y: -10 }}
                    className="relative group"
                  >
                    <div className="relative h-full p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300"></div>

                      <div className="relative z-10">
                        <div className="text-5xl mb-4">{item.icon}</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                variants={fadeInUp}
                className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white text-center shadow-2xl"
              >
                <p className="text-2xl md:text-3xl font-bold mb-4">
                  Each tool is not theory — it&apos;s a concrete step you can take today.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Why This Matters Section */}
        <section className="py-32 bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 text-white relative overflow-hidden">
          {/* Animated stars */}
          <div className="absolute inset-0">
            {[...Array(100)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                }}
              />
            ))}
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
              className="max-w-5xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="text-center mb-20">
                <Heart className="w-16 h-16 text-pink-400 mx-auto mb-6" />
                <h2 className="text-5xl md:text-6xl font-bold mb-6">
                  Why This <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Matters</span>
                </h2>
              </motion.div>

              <div className="space-y-8 mb-16">
                {whyImportant.map((point, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="flex items-center space-x-6 p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xl">{index + 1}</span>
                    </div>
                    <p className="text-xl md:text-2xl text-gray-100 leading-relaxed">{point}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                variants={fadeInUp}
                className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center"
              >
                <h3 className="text-3xl md:text-4xl font-bold mb-6">
                  ENERGYLogic is a place where they can:
                </h3>
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm">
                    <p className="text-xl text-gray-100">Exhale</p>
                  </div>
                  <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm">
                    <p className="text-xl text-gray-100">Get a systematic plan</p>
                  </div>
                  <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm">
                    <p className="text-xl text-gray-100">Regain health and energy</p>
                  </div>
                  <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm">
                    <p className="text-xl text-gray-100">Stop drowning in chaos</p>
                  </div>
                  <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm md:col-span-2">
                    <p className="text-xl text-gray-100">Reach a new level of life</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="mt-16 text-center"
              >
                <p className="text-3xl md:text-4xl font-bold mb-4">
                  This is not about motivation.
                </p>
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  This is about navigation.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50"></div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={staggerContainer}
              className="max-w-4xl mx-auto"
            >
              <motion.div
                variants={fadeInUp}
                className="text-center mb-12"
              >
                <Compass className="w-20 h-20 text-blue-600 mx-auto mb-8" />
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                  Our Mission Statement
                </h2>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-12 md:p-16 text-white shadow-2xl relative overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <p className="text-2xl md:text-3xl font-bold mb-8 leading-relaxed text-center">
                    We create a system that helps strong people recover, take control of their lives, and build a new path
                  </p>
                  <div className="flex items-center justify-center space-x-4 mt-12 pt-8 border-t border-white/20">
                    <p className="text-xl text-blue-100">Honestly</p>
                    <span className="text-white/50">•</span>
                    <p className="text-xl text-blue-100">Structurally</p>
                    <span className="text-white/50">•</span>
                    <p className="text-xl text-blue-100">Without empty words</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
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
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Ready to Rebuild Your Path?
              </h2>
              <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-blue-100">
                Join the strong who chose to navigate their way out, not wait to be saved
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleCallRequest}
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6"
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Start Your Journey
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6"
                >
                  <Link href="/book">
                    <Calendar className="mr-2 w-5 h-5" />
                    Book a Session
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      <CallRequestModal
        isOpen={isCallModalOpen}
        onClose={handleCloseCallModal}
      />
    </div>
  )
}
