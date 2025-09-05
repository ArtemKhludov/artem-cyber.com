import { PageLayout } from '@/components/layout/PageLayout'

export default function PrivacyPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Политика конфиденциальности</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 text-lg mb-8">
            Дата последней редакции: {new Date().toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Общие положения</h2>
          <p className="text-gray-700 mb-4">
            Настоящая Политика конфиденциальности описывает, как мы — команда проекта EnergyLogic, осуществляющая деятельность из Лос-Анджелеса, Калифорния, США, — собираем, используем и храним ваши персональные данные.
          </p>
          <p className="text-gray-700 mb-4">
            На момент публикации настоящего документа юридическое лицо не зарегистрировано, однако мы строго следуем принципам:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Федерального закона РФ №152‑ФЗ «О персональных данных»;</li>
            <li>Общего регламента защиты данных ЕС (GDPR);</li>
            <li>Закона Калифорнии о конфиденциальности потребителей (CCPA);</li>
            <li>Общих принципов добросовестного обращения с персональными данными.</li>
          </ul>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Какие данные мы собираем</h2>
          <p className="text-gray-700 mb-4">
            Мы собираем только те данные, которые вы сознательно и добровольно передаёте при:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Прохождении тестов и опросов;</li>
            <li>Оформлении заявки на обратный звонок;</li>
            <li>Взаимодействии с нашим Telegram-ботом @energylogic_callback_bot;</li>
            <li>Посещении сайта и использовании его функционала.</li>
          </ul>
          <p className="text-gray-700 mb-4">
            Может включать:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Имя, номер телефона, email (при вводе в форму);</li>
            <li>Ответы на диагностические тесты;</li>
            <li>IP-адрес, тип браузера, информация о сессии (анонимно, через Google Analytics или Posthog);</li>
            <li>Технические метаданные от Supabase, OpenAI и Telegram API.</li>
          </ul>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Как мы используем данные</h2>
          <p className="text-gray-700 mb-4">
            Ваши данные обрабатываются исключительно с целью:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Подбора индивидуальных материалов (PDF-документов, программ, видео);</li>
            <li>Отправки результатов тестирования;</li>
            <li>Контактной связи по вашему запросу;</li>
            <li>Улучшения точности нашей аналитики и качества сервиса.</li>
          </ul>
          <p className="text-gray-700 mb-6">
            Мы не продаём, не обмениваемся и не передаём ваши данные третьим лицам вне рамок используемых сервисов (Supabase, OpenAI, Telegram, Google).
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Хранение и защита</h2>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li>Все данные хранятся в Supabase (платформа с серверным контролем доступа и шифрованием);</li>
            <li>Обращения к OpenAI (GPT) происходят только после согласия пользователя;</li>
            <li>Telegram-заявки приходят только в закрытый канал, доступный только администратору;</li>
            <li>Данные удаляются по вашему письменному запросу или автоматически через 12 месяцев без активности.</li>
          </ul>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Ваши права</h2>
          <p className="text-gray-700 mb-4">
            Вы имеете право:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Получить копию всех данных, которые мы храним о вас;</li>
            <li>Изменить или удалить их;</li>
            <li>Запретить дальнейшую обработку.</li>
          </ul>
          <p className="text-gray-700 mb-6">
            Запрос можно отправить в Telegram-боте или по email (см. ниже).
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Использование файлов cookie</h2>
          <p className="text-gray-700 mb-6">
            Мы используем файлы cookie и пиксели отслеживания, чтобы анализировать поведение на сайте. Это помогает нам улучшать пользовательский опыт. Вы можете отключить cookie в настройках вашего браузера.
          </p>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Контактная информация</h2>
          <div className="text-gray-700 mb-6 space-y-2">
            <p><strong>Адрес:</strong> 6333 Canoga Ave, Apt 255, Woodland Hills, Los Angeles, CA 91367, USA</p>
            <p><strong>Telegram:</strong> @energylogic_callback_bot</p>
            <p><strong>Email:</strong> energylogic@project.ai</p>
            <p><strong>Ответственный за обработку данных:</strong> Artem Khlydov (основатель проекта)</p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Изменения в политике</h2>
          <p className="text-gray-700 mb-6">
            Эта политика может быть обновлена без предварительного уведомления. Все изменения будут отражены на этой странице с актуальной датой редакции.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
