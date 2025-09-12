import { PageLayout } from '@/components/layout/PageLayout'

export default function TermsPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Пользовательское соглашение</h1>

        <div className="prose prose-lg max-w-none">
          <div className="text-gray-600 text-lg mb-8 space-y-2">
            <p>Дата вступления в силу: {new Date().toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p>Последняя редакция: {new Date().toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Общие положения</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>1.1.</strong> Настоящее соглашение (далее — "Соглашение") регулирует отношения между пользователем (далее — "Пользователь") и владельцами платформы EnergyLogic (далее — "Администрация").
            </p>
            <p>
              <strong>1.2.</strong> Используя сайт, вы подтверждаете согласие с условиями настоящего Соглашения. В случае несогласия с каким-либо пунктом — пожалуйста, прекратите использование сайта.
            </p>
            <p>
              <strong>1.3.</strong> На текущем этапе Администрация осуществляет деятельность без регистрации юридического лица. Проект носит экспериментальный характер и предоставляется как частная инициатива.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Характер сервиса</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>2.1.</strong> EnergyLogic предоставляет доступ к авторским материалам, курсам, онлайн-тестам, аналитике и результатам, сгенерированным с использованием интеллектуальных алгоритмов и языковых моделей (например, GPT от OpenAI).
            </p>
            <p>
              <strong>2.2.</strong> Платформа не является:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>медицинским, психотерапевтическим или консультативным учреждением;</li>
              <li>аккредитованным образовательным центром;</li>
              <li>поставщиком услуг, подлежащих обязательному лицензированию.</li>
            </ul>
            <p>
              <strong>2.3.</strong> Вся информация на сайте носит исключительно информационно-аналитический и ознакомительный характер. Она не является заменой профессиональной консультации и не должна трактоваться как руководство к действию в вопросах здоровья, психологии или жизненно важных решений.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Юрисдикция и ответственность</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>3.1.</strong> Взаимодействие с платформой осуществляется из юрисдикции США, штат Калифорния.
            </p>
            <p>
              <strong>3.2.</strong> Пользователь несёт ответственность за соответствие использования сервиса требованиям законодательства своей страны и обязуется самостоятельно удостовериться в правомерности обращения с представленными материалами в своей юрисдикции.
            </p>
            <p>
              <strong>3.3.</strong> Администрация прилагает разумные усилия для корректной работы сервиса, но не гарантирует отсутствие технических сбоев, ошибок генерации, задержек или потери данных, связанных с использованием сторонних API и интернет-сервисов.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Обработка и защита данных</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>4.1.</strong> Пользователь соглашается на обработку предоставленных данных (включая, но не ограничиваясь: имя, email, Telegram-аккаунт, результаты тестов) в рамках работы платформы и для улучшения качества предоставляемого сервиса.
            </p>
            <p>
              <strong>4.2.</strong> Обработка данных осуществляется в соответствии с международными стандартами конфиденциальности и безопасности. Подробнее см. <a href="/privacy" className="text-blue-600 hover:underline">Политику конфиденциальности</a>.
            </p>
            <p>
              <strong>4.3.</strong> Платформа может использовать cookie-файлы, session/local storage, аналитику поведения на сайте в целях технической оптимизации.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Ограничения</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>5.1.</strong> Пользователю запрещается:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>использовать платформу в целях, противоречащих применимому законодательству;</li>
              <li>копировать, распространять или коммерчески использовать материалы без письменного разрешения;</li>
              <li>пытаться изменить логику работы сервиса или вмешиваться в функционирование платформы.</li>
            </ul>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Интеллектуальная собственность</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>6.1.</strong> Все материалы, опубликованные на сайте, являются интеллектуальной собственностью Администрации или привлечённых авторов и защищены авторским правом.
            </p>
            <p>
              <strong>6.2.</strong> Их использование возможно только в рамках личного, некоммерческого ознакомления, если иное не согласовано отдельно.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Изменения в Соглашении</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>7.1.</strong> Администрация вправе вносить изменения в настоящее Соглашение без предварительного уведомления. Изменения вступают в силу с момента публикации на сайте.
            </p>
          </div>

          <div className="border-t border-b border-gray-300 my-8"></div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Контакты</h2>
          <div className="text-gray-700 mb-6 space-y-2">
            <p><strong>Telegram-бот:</strong> @energylogic_callback_bot</p>
            <p><strong>Email:</strong> energylogic.help@gmail.com</p>
            <p><strong>Локация:</strong> Лос-Анджелес, Калифорния, США</p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
