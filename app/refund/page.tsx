import { PageLayout } from '@/components/layout/PageLayout'

export default function RefundPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Условия возврата</h1>
        
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
              <strong>1.1.</strong> Платформа EnergyLogic предоставляет цифровые услуги: доступ к интерактивным тестам, индивидуальным аналитическим отчётам, PDF-файлам, консультационным материалам и онлайн-программам.
            </p>
            <p>
              <strong>1.2.</strong> Согласно международной практике и применимому законодательству, цифровой контент, предоставляемый немедленно после оплаты, не подлежит возврату, если пользователь предварительно дал согласие на немедленное исполнение и признал потерю права на отказ от покупки.
            </p>
            <p>
              <strong>1.3.</strong> Оформляя заказ, вы соглашаетесь с тем, что доступ к материалам или результатам может быть предоставлен немедленно (в том числе автоматически), что приравнивается к полному исполнению услуги.
            </p>
          </div>
          
          <div className="border-t border-b border-gray-300 my-8"></div>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Условия возврата</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>2.1.</strong> Мы предоставляем возврат средств в исключительных случаях, если:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>услуга не была оказана по технической причине (например, сбой системы, двойная оплата);</li>
              <li>пользователь не получил доступ к материалам, несмотря на подтверждённую оплату;</li>
              <li>была списана сумма, не соответствующая заявленной стоимости.</li>
            </ul>
            <p>
              <strong>2.2.</strong> Все заявки на возврат рассматриваются в индивидуальном порядке. В большинстве случаев мы предлагаем:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>устранение технической проблемы;</li>
              <li>повторный доступ к материалу;</li>
              <li>перенос или замена услуги.</li>
            </ul>
            <p>
              <strong>2.3.</strong> Возврат не предоставляется, если:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>пользователь получил доступ к PDF-файлам, результатам теста или другим цифровым материалам;</li>
              <li>тест/сессия уже была пройдена или начата;</li>
              <li>заявка подана спустя 3 календарных дня после покупки;</li>
              <li>пользователь ожидал конкретного эффекта, но результат оказался субъективно иным (так как не гарантируется терапевтический эффект).</li>
            </ul>
          </div>
          
          <div className="border-t border-b border-gray-300 my-8"></div>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Как подать запрос на возврат</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>3.1.</strong> Если вы считаете, что произошла ошибка — напишите нам на email или в Telegram:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg my-4">
              <p><strong>Email:</strong> energylogic.help@gmail.com</p>
              <p><strong>Telegram-бот:</strong> @energylogic_callback_bot</p>
            </div>
            <p>
              <strong>3.2.</strong> Укажите:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>дату и способ оплаты;</li>
              <li>email, указанный при покупке;</li>
              <li>описание ситуации.</li>
            </ul>
            <p>
              <strong>3.3.</strong> Мы рассматриваем обращение в течение 3 рабочих дней и предоставим вам решение.
            </p>
          </div>
          
          <div className="border-t border-b border-gray-300 my-8"></div>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Дополнительные условия</h2>
          <div className="text-gray-700 mb-6 space-y-4">
            <p>
              <strong>4.1.</strong> Возврат средств осуществляется на ту же платёжную систему, с которой была произведена оплата.
            </p>
            <p>
              <strong>4.2.</strong> В случае возврата средств доступ к материалам автоматически блокируется.
            </p>
            <p>
              <strong>4.3.</strong> Комиссии платёжных систем (если они были удержаны) могут не компенсироваться.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
