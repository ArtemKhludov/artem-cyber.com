import { PageLayout } from '@/components/layout/PageLayout'

export default function PrivacyPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Политика конфиденциальности</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 text-lg mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Сбор информации</h2>
          <p className="text-gray-700 mb-4">
            Мы собираем только необходимую информацию для предоставления наших услуг.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Использование данных</h2>
          <p className="text-gray-700 mb-4">
            Ваши данные используются исключительно для проведения диагностики и улучшения сервиса.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Защита данных</h2>
          <p className="text-gray-700 mb-4">
            Мы применяем современные методы защиты для обеспечения безопасности ваших данных.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Ваши права</h2>
          <p className="text-gray-700 mb-4">
            Вы имеете право на доступ, изменение и удаление своих персональных данных.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Контакты</h2>
          <p className="text-gray-700 mb-4">
            По вопросам конфиденциальности: energylogic@project.ai
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
