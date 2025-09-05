import { PageLayout } from '@/components/layout/PageLayout'

export default function DisclaimerPage() {
    return (
        <PageLayout>
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Отказ от ответственности</h1>

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

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Общая информация</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>1.1.</strong> Платформа EnergyLogic предоставляет информационные, аналитические и консультационные материалы, доступ к тестам, индивидуальным PDF-отчётам и цифровым курсам, созданным на основе авторских методик.
                        </p>
                        <p>
                            <strong>1.2.</strong> Все материалы носят информационно-рефлексивный характер и направлены на расширение осознанности, самонаблюдение и самоанализ. Они не являются медицинскими, психотерапевтическими, психологическими или юридическими услугами.
                        </p>
                        <p>
                            <strong>1.3.</strong> Использование платформы означает согласие пользователя с данным отказом от ответственности.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Не является медицинским или психотерапевтическим инструментом</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>2.1.</strong> EnergyLogic не заменяет:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>консультации с врачом, психологом или психотерапевтом;</li>
                            <li>диагностику и лечение физических или психических заболеваний;</li>
                            <li>официально лицензированную помощь в состоянии кризиса.</li>
                        </ul>
                        <p>
                            <strong>2.2.</strong> Все рекомендации и результаты, включая сгенерированные ИИ-ответы, — не являются диагнозом, предписанием или медицинским заключением.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Работа с искусственным интеллектом</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>3.1.</strong> Некоторые результаты, тесты и тексты, представленные на платформе, частично или полностью формируются с использованием искусственного интеллекта (ИИ), включая языковые модели OpenAI.
                        </p>
                        <p>
                            <strong>3.2.</strong> Хотя мы предпринимаем усилия для проверки корректности, ИИ может допускать логические или фактические ошибки, а его ответы не являются мнением человека-эксперта.
                        </p>
                        <p>
                            <strong>3.3.</strong> Пользователь осознаёт, что вся ответственность за интерпретацию материалов лежит на нём самом.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Индивидуальная ответственность пользователя</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>4.1.</strong> Пользователь принимает на себя полную ответственность за последствия использования материалов платформы, включая любые внутренние изменения, принятые решения и действия.
                        </p>
                        <p>
                            <strong>4.2.</strong> EnergyLogic и её создатели не несут ответственности за прямые или косвенные убытки, включая, но не ограничиваясь:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>эмоциональными или психологическими реакциями;</li>
                            <li>изменением образа жизни;</li>
                            <li>деловыми, личными или финансовыми решениями, принятыми после прохождения тестов или изучения материалов.</li>
                        </ul>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Работа с чувствительными темами</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>5.1.</strong> Некоторые материалы могут затрагивать внутренние паттерны, детские сценарии, бессознательные процессы, личные травмы и вопросы мировоззрения.
                        </p>
                        <p>
                            <strong>5.2.</strong> Пользователь осознаёт, что:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>он может столкнуться с эмоциональной реакцией;</li>
                            <li>платформа не даёт гарантий результата;</li>
                            <li>участие всегда является добровольным и может быть прекращено по желанию пользователя.</li>
                        </ul>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. География доступа и правовые ограничения</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>6.1.</strong> EnergyLogic доступна пользователям по всему миру.
                        </p>
                        <p>
                            <strong>6.2.</strong> Пользователь самостоятельно несёт ответственность за соблюдение местного законодательства при использовании платформы.
                        </p>
                        <p>
                            <strong>6.3.</strong> Мы не несем ответственности за невозможность использования сервиса, если он нарушает правовые нормы в вашей стране проживания.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Ограничение ответственности</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>7.1.</strong> В пределах, допускаемых применимым законодательством, EnergyLogic, его авторы, разработчики и операторы не несут ответственности за:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>случайные, косвенные, штрафные или иные убытки;</li>
                            <li>потерю данных, прибыли, репутации, деловых возможностей;</li>
                            <li>технические сбои, ошибки алгоритма, сбои в платёжных системах или передаче данных.</li>
                        </ul>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Контактные данные</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            Если у вас есть вопросы по данному отказу от ответственности, напишите нам:
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg my-4">
                            <p><strong>📩 Email:</strong> energylogic.help@gmail.com</p>
                            <p><strong>🤖 Telegram-бот:</strong> @energylogic_callback_bot</p>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    )
}
