import { Users, Target, Award, Shield, Brain, Zap, Heart, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PageLayout } from '@/components/layout/PageLayout'

export const metadata = {
  title: 'О проекте EnergyLogic - Революция в психоанализе',
  description: 'Узнайте больше о EnergyLogic - революционной платформе для глубокого самопознания с использованием искусственного интеллекта',
}

export default function AboutPage() {
  const features = [
    {
      icon: Brain,
      title: 'ИИ-анализ',
      description: 'Передовые алгоритмы машинного обучения для глубокого понимания личности'
    },
    {
      icon: Zap,
      title: 'Быстрый результат',
      description: 'Получите детальный анализ всего за 20 минут интерактивной сессии'
    },
    {
      icon: Heart,
      title: 'Безопасность',
      description: 'Конфиденциальность и защита ваших данных на самом высоком уровне'
    },
    {
      icon: TrendingUp,
      title: 'Трансформация',
      description: 'Персональные программы развития для достижения ваших целей'
    }
  ]

  const stats = [
    { value: '10,000+', label: 'Проведено сессий' },
    { value: '98%', label: 'Точность анализа' },
    { value: '95%', label: 'Довольных клиентов' },
    { value: '50+', label: 'Стран мира' }
  ]

  const team = [
    {
      name: 'Доктор Анна Петрова',
      role: 'Ведущий психоаналитик',
      description: 'Кандидат психологических наук, 15+ лет опыта в клинической психологии'
    },
    {
      name: 'Михаил Козлов',
      role: 'Технический директор',
      description: 'PhD в области машинного обучения, экс-Google, создатель ИИ-алгоритмов'
    },
    {
      name: 'Елена Волкова',
      role: 'Методист-разработчик',
      description: 'Магистр психологии, специалист по разработке психодиагностических методик'
    }
  ]

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            О проекте <span className="text-blue-200">EnergyLogic</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Мы создаем будущее психоанализа, объединяя человеческую мудрость с возможностями искусственного интеллекта
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              <Link href="/book">Попробовать сейчас</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/contacts">Связаться с нами</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Наша миссия
              </h2>
              <div className="space-y-6 text-lg text-gray-700">
                <p>
                  EnergyLogic был создан с простой, но амбициозной целью — сделать глубокий психоанализ 
                  доступным каждому человеку на планете.
                </p>
                <p>
                  Мы верим, что понимание себя — это основа счастливой и осмысленной жизни. 
                  Однако традиционный психоанализ часто недоступен из-за высокой стоимости, 
                  длительности процесса и нехватки квалифицированных специалистов.
                </p>
                <p>
                  Наша революционная платформа использует передовые технологии ИИ для создания 
                  персонализированного психологического портрета за считанные минуты, 
                  предоставляя точность профессионального анализа в удобном формате.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Почему выбирают EnergyLogic
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Наш подход объединяет лучшие практики психологии с инновационными технологиями
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Наша команда
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Эксперты в области психологии и технологий, объединенные общей целью
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Готовы начать свое путешествие к самопознанию?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к тысячам людей, которые уже изменили свою жизнь с помощью EnergyLogic
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              <Link href="/catalog">Выбрать программу</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/book">Записаться на сессию</Link>
            </Button>
          </div>
        </div>
      </section>
      </div>
    </PageLayout>
  )
}
