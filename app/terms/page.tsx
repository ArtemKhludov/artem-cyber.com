import { PageLayout } from '@/components/layout/PageLayout'

export default function TermsPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Условия использования</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 text-lg mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Общие положения</h2>
          <p className="text-gray-700 mb-4">
            Добро пожаловать в EnergyLogic. Используя наш сервис, вы соглашаетесь с данными условиями.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Услуги</h2>
          <p className="text-gray-700 mb-4">
            EnergyLogic предоставляет услуги энергетической диагностики и персональных консультаций.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Ответственность</h2>
          <p className="text-gray-700 mb-4">
            Мы стремимся предоставить качественные услуги, но не гарантируем конкретных результатов.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Контакты</h2>
          <p className="text-gray-700 mb-4">
            По вопросам обращайтесь: energylogic@project.ai
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
