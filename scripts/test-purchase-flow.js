require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPurchaseFlow() {
    console.log('🛒 ТЕСТИРОВАНИЕ ПРОЦЕССА ПОКУПКИ\n')
    console.log('👤 Тестовый пользователь: user@test.com\n')

    const issues = []
    const testResults = []

    try {
        // 1. Получаем доступные курсы для покупки
        console.log('1️⃣ ПОЛУЧЕНИЕ ДОСТУПНЫХ КУРСОВ')
        console.log('=' * 50)

        const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('course_type', 'mini_course')
            .order('created_at', { ascending: false })

        if (docsError) {
            console.error('❌ Ошибка получения документов:', docsError)
            issues.push('Ошибка получения доступных курсов')
            return
        }

        console.log(`✅ Найдено курсов: ${documents.length}`)
        documents.forEach((doc, index) => {
            console.log(`   ${index + 1}. ${doc.title} - ${doc.price_rub} ₽`)
        })

        // 2. Выбираем курс для тестирования (не купленный пользователем)
        console.log('\n2️⃣ ВЫБОР КУРСА ДЛЯ ТЕСТИРОВАНИЯ')
        console.log('=' * 50)

        // Получаем уже купленные курсы
        const { data: userPurchases, error: purchasesError } = await supabase
            .from('purchases')
            .select('document_id')
            .eq('user_email', 'user@test.com')
            .eq('payment_status', 'completed')

        if (purchasesError) {
            console.error('❌ Ошибка получения покупок:', purchasesError)
            issues.push('Ошибка получения покупок пользователя')
            return
        }

        const purchasedIds = userPurchases.map(p => p.document_id)
        const availableForPurchase = documents.filter(doc => !purchasedIds.includes(doc.id))

        console.log(`✅ Курсов доступно для покупки: ${availableForPurchase.length}`)

        if (availableForPurchase.length === 0) {
            console.log('⚠️ Все курсы уже куплены пользователем!')
            issues.push('Нет доступных курсов для тестирования покупки')
            return
        }

        const selectedCourse = availableForPurchase[0]
        console.log(`✅ Выбран курс: ${selectedCourse.title}`)
        console.log(`   ID: ${selectedCourse.id}`)
        console.log(`   Цена: ${selectedCourse.price_rub} ₽`)

        // 3. Тестируем страницу оформления заказа
        console.log('\n3️⃣ ТЕСТИРОВАНИЕ СТРАНИЦЫ ОФОРМЛЕНИЯ ЗАКАЗА')
        console.log('=' * 50)

        console.log(`   📄 Тестирование страницы: /checkout/${selectedCourse.id}`)
        try {
            const checkoutResponse = await fetch(`http://localhost:3002/checkout/${selectedCourse.id}`, { method: 'HEAD' })
            const checkoutStatus = checkoutResponse.status === 200 ? '✅' : '❌'
            console.log(`      Статус: ${checkoutStatus} (${checkoutResponse.status})`)

            if (checkoutResponse.status !== 200) {
                issues.push(`Страница оформления заказа недоступна (${checkoutResponse.status})`)
            }
        } catch (error) {
            console.log(`      ❌ Ошибка: ${error.message}`)
            issues.push(`Ошибка доступа к странице оформления заказа: ${error.message}`)
        }

        // 4. Тестируем API создания платежа
        console.log('\n4️⃣ ТЕСТИРОВАНИЕ API СОЗДАНИЯ ПЛАТЕЖА')
        console.log('=' * 50)

        console.log(`   💳 Тестирование API: /api/purchase/create-payment`)
        try {
            const paymentResponse = await fetch('http://localhost:3002/api/purchase/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    documentId: selectedCourse.id,
                    amount: selectedCourse.price_rub,
                    currency: 'RUB',
                    userEmail: 'user@test.com',
                    userCountry: 'RU',
                    userIP: '127.0.0.1'
                })
            })

            const paymentStatus = paymentResponse.status === 200 ? '✅' : '❌'
            console.log(`      Статус: ${paymentStatus} (${paymentResponse.status})`)

            if (paymentResponse.ok) {
                const paymentData = await paymentResponse.json()
                console.log(`      ✅ Платеж создан успешно`)
                console.log(`      Payment Intent ID: ${paymentData.paymentIntentId || 'N/A'}`)
                console.log(`      Client Secret: ${paymentData.clientSecret ? 'Есть' : 'Отсутствует'}`)
            } else {
                const errorData = await paymentResponse.text()
                console.log(`      ❌ Ошибка: ${errorData}`)
                issues.push(`API создания платежа возвращает ошибку: ${paymentResponse.status}`)
            }
        } catch (error) {
            console.log(`      ❌ Ошибка: ${error.message}`)
            issues.push(`Ошибка подключения к API создания платежа: ${error.message}`)
        }

        // 5. Тестируем API Cryptomus
        console.log('\n5️⃣ ТЕСТИРОВАНИЕ API CRYPTOMUS')
        console.log('=' * 50)

        console.log(`   💰 Тестирование API: /api/cryptomus/create-payment`)
        try {
            const cryptomusResponse = await fetch('http://localhost:3002/api/cryptomus/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    documentId: selectedCourse.id,
                    amount: selectedCourse.price_rub,
                    currency: 'RUB'
                })
            })

            const cryptomusStatus = cryptomusResponse.status === 200 ? '✅' : '❌'
            console.log(`      Статус: ${cryptomusStatus} (${cryptomusResponse.status})`)

            if (cryptomusResponse.ok) {
                const cryptomusData = await cryptomusResponse.json()
                console.log(`      ✅ Платеж Cryptomus создан успешно`)
                console.log(`      Order ID: ${cryptomusData.orderId || 'N/A'}`)
                console.log(`      Payment URL: ${cryptomusData.paymentUrl ? 'Есть' : 'Отсутствует'}`)
            } else {
                const errorData = await cryptomusResponse.text()
                console.log(`      ❌ Ошибка: ${errorData}`)
                issues.push(`API Cryptomus возвращает ошибку: ${cryptomusResponse.status}`)
            }
        } catch (error) {
            console.log(`      ❌ Ошибка: ${error.message}`)
            issues.push(`Ошибка подключения к API Cryptomus: ${error.message}`)
        }

        // 6. Тестируем страницу успешной оплаты
        console.log('\n6️⃣ ТЕСТИРОВАНИЕ СТРАНИЦЫ УСПЕШНОЙ ОПЛАТЫ')
        console.log('=' * 50)

        console.log(`   ✅ Тестирование страницы: /checkout/success`)
        try {
            const successResponse = await fetch('http://localhost:3002/checkout/success', { method: 'HEAD' })
            const successStatus = successResponse.status === 200 ? '✅' : '❌'
            console.log(`      Статус: ${successStatus} (${successResponse.status})`)

            if (successResponse.status !== 200) {
                issues.push(`Страница успешной оплаты недоступна (${successResponse.status})`)
            }
        } catch (error) {
            console.log(`      ❌ Ошибка: ${error.message}`)
            issues.push(`Ошибка доступа к странице успешной оплаты: ${error.message}`)
        }

        // 7. Тестируем webhook'и
        console.log('\n7️⃣ ТЕСТИРОВАНИЕ WEBHOOK\'ОВ')
        console.log('=' * 50)

        // Stripe webhook
        console.log(`   🔗 Тестирование Stripe webhook: /api/stripe/webhook`)
        try {
            const stripeWebhookResponse = await fetch('http://localhost:3002/api/stripe/webhook', { method: 'HEAD' })
            const stripeWebhookStatus = stripeWebhookResponse.status === 200 ? '✅' : '❌'
            console.log(`      Статус: ${stripeWebhookStatus} (${stripeWebhookResponse.status})`)

            if (stripeWebhookResponse.status !== 200) {
                issues.push(`Stripe webhook недоступен (${stripeWebhookResponse.status})`)
            }
        } catch (error) {
            console.log(`      ❌ Ошибка: ${error.message}`)
            issues.push(`Ошибка доступа к Stripe webhook: ${error.message}`)
        }

        // Cryptomus webhook
        console.log(`   🔗 Тестирование Cryptomus webhook: /api/cryptomus/callback`)
        try {
            const cryptomusWebhookResponse = await fetch('http://localhost:3002/api/cryptomus/callback', { method: 'HEAD' })
            const cryptomusWebhookStatus = cryptomusWebhookResponse.status === 200 ? '✅' : '❌'
            console.log(`      Статус: ${cryptomusWebhookStatus} (${cryptomusWebhookResponse.status})`)

            if (cryptomusWebhookResponse.status !== 200) {
                issues.push(`Cryptomus webhook недоступен (${cryptomusWebhookResponse.status})`)
            }
        } catch (error) {
            console.log(`      ❌ Ошибка: ${error.message}`)
            issues.push(`Ошибка доступа к Cryptomus webhook: ${error.message}`)
        }

        // 8. Итоговый отчет
        console.log('\n8️⃣ ИТОГОВЫЙ ОТЧЕТ')
        console.log('=' * 50)

        if (issues.length === 0) {
            console.log('🎉 ВСЕ ТЕСТЫ ПРОЦЕССА ПОКУПКИ ПРОЙДЕНЫ УСПЕШНО!')
            console.log('✅ Страница оформления заказа доступна')
            console.log('✅ API создания платежей работают')
            console.log('✅ Webhook\'и настроены')
            console.log('✅ Страница успешной оплаты доступна')
        } else {
            console.log(`❌ НАЙДЕНО ПРОБЛЕМ: ${issues.length}`)
            console.log('\n📋 СПИСОК ПРОБЛЕМ:')
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`)
            })
        }

        console.log('\n📊 СТАТИСТИКА:')
        console.log(`   Курсов доступно: ${availableForPurchase.length}`)
        console.log(`   Выбранный курс: ${selectedCourse.title}`)
        console.log(`   Проблем: ${issues.length}`)
        console.log(`   Статус: ${issues.length === 0 ? '✅ ГОТОВО' : '❌ ТРЕБУЕТ ИСПРАВЛЕНИЯ'}`)

    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message)
        issues.push(`Критическая ошибка: ${error.message}`)
    }

    return issues
}

// Запускаем тестирование
testPurchaseFlow().then(issues => {
    if (issues && issues.length > 0) {
        console.log('\n🚨 ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ ПРОБЛЕМ!')
        process.exit(1)
    } else {
        console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!')
        process.exit(0)
    }
})
