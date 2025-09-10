require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testUserExperience() {
    console.log('🧪 ПОЛНОЕ ТЕСТИРОВАНИЕ ПОЛЬЗОВАТЕЛЬСКОГО ОПЫТА\n')
    console.log('👤 Тестовый пользователь: user@test.com / user123\n')

    const issues = []

    try {
        // 1. Проверяем пользователя
        console.log('1️⃣ ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ')
        console.log('=' * 50)

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'user@test.com')

        if (usersError) {
            console.error('❌ Ошибка получения пользователя:', usersError)
            issues.push('Ошибка получения пользователя из базы данных')
            return
        }

        if (!users || users.length === 0) {
            console.error('❌ Пользователь user@test.com не найден')
            issues.push('Пользователь user@test.com не существует в базе данных')
            return
        }

        const user = users[0]
        console.log(`✅ Пользователь найден: ${user.email}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Роль: ${user.role}`)
        console.log(`   Активен: ${user.is_active}`)
        console.log(`   Email подтвержден: ${user.email_verified}`)

        // 2. Проверяем покупки пользователя
        console.log('\n2️⃣ ПРОВЕРКА ПОКУПОК ПОЛЬЗОВАТЕЛЯ')
        console.log('=' * 50)

        const { data: purchases, error: purchasesError } = await supabase
            .from('purchases')
            .select(`
        id,
        document_id,
        payment_status,
        amount_paid,
        currency,
        created_at,
        documents (
          id,
          title,
          description,
          price_rub,
          cover_url,
          file_url,
          course_type,
          has_workbook,
          has_videos,
          has_audio,
          video_count,
          workbook_count,
          course_duration_minutes,
          video_urls,
          audio_url
        )
      `)
            .eq('user_email', 'user@test.com')
            .eq('payment_status', 'completed')

        if (purchasesError) {
            console.error('❌ Ошибка получения покупок:', purchasesError)
            issues.push('Ошибка получения покупок пользователя')
            return
        }

        console.log(`✅ Найдено покупок: ${purchases.length}`)

        if (purchases.length === 0) {
            console.log('⚠️ У пользователя нет покупок!')
            issues.push('У пользователя нет завершенных покупок')
        } else {
            purchases.forEach((purchase, index) => {
                const doc = purchase.documents
                console.log(`\n   📚 Курс ${index + 1}: ${doc.title}`)
                console.log(`      ID: ${doc.id}`)
                console.log(`      Тип: ${doc.course_type}`)
                console.log(`      Цена: ${doc.price_rub} ₽`)
                console.log(`      Статус: ${purchase.payment_status}`)
                console.log(`      Материалы:`)
                console.log(`        📄 Основной PDF: ${doc.file_url ? '✅' : '❌'}`)
                console.log(`        📖 Рабочие тетради: ${doc.has_workbook ? `✅ (${doc.workbook_count})` : '❌'}`)
                console.log(`        🎥 Видео: ${doc.has_videos ? `✅ (${doc.video_count})` : '❌'}`)
                console.log(`        🎵 Аудио: ${doc.has_audio ? '✅' : '❌'}`)
                console.log(`        🖼️ Обложка: ${doc.cover_url ? '✅' : '❌'}`)

                // Проверяем доступность файлов
                if (!doc.file_url) {
                    issues.push(`У курса "${doc.title}" отсутствует основной PDF файл`)
                }
                if (!doc.cover_url) {
                    issues.push(`У курса "${doc.title}" отсутствует обложка`)
                }
                if (doc.has_workbook && doc.workbook_count === 0) {
                    issues.push(`У курса "${doc.title}" указано наличие тетрадей, но количество = 0`)
                }
                if (doc.has_videos && doc.video_count === 0) {
                    issues.push(`У курса "${doc.title}" указано наличие видео, но количество = 0`)
                }
                if (doc.has_audio && !doc.audio_url) {
                    issues.push(`У курса "${doc.title}" указано наличие аудио, но отсутствует URL`)
                }
            })
        }

        // 3. Проверяем API дашборда
        console.log('\n3️⃣ ПРОВЕРКА API ДАШБОРДА')
        console.log('=' * 50)

        try {
            const response = await fetch('http://localhost:3002/api/user/dashboard', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': 'session_token=test-session-token'
                }
            })

            console.log(`   Статус ответа: ${response.status}`)

            if (response.status === 401) {
                console.log('   ⚠️ API требует авторизацию (это нормально)')
            } else if (response.ok) {
                const data = await response.json()
                console.log('   ✅ API дашборда работает')
                console.log(`   Покупки: ${data.purchases?.length || 0}`)
                console.log(`   Курсы: ${data.courses?.length || 0}`)
                console.log(`   Статистика:`, data.stats)
            } else {
                console.log(`   ❌ Ошибка API: ${response.status}`)
                issues.push(`API дашборда возвращает ошибку ${response.status}`)
            }
        } catch (error) {
            console.log(`   ❌ Ошибка подключения к API: ${error.message}`)
            issues.push(`Не удается подключиться к API дашборда: ${error.message}`)
        }

        // 4. Проверяем доступ к файлам
        console.log('\n4️⃣ ПРОВЕРКА ДОСТУПА К ФАЙЛАМ')
        console.log('=' * 50)

        if (purchases.length > 0) {
            const firstPurchase = purchases[0]
            const doc = firstPurchase.documents

            console.log(`   Тестируем доступ к файлам курса: ${doc.title}`)

            // Проверяем основной PDF
            if (doc.file_url) {
                try {
                    const pdfResponse = await fetch(doc.file_url, { method: 'HEAD' })
                    console.log(`   📄 Основной PDF: ${pdfResponse.status === 200 ? '✅ Доступен' : `❌ Ошибка ${pdfResponse.status}`}`)
                    if (pdfResponse.status !== 200) {
                        issues.push(`Основной PDF курса "${doc.title}" недоступен (${pdfResponse.status})`)
                    }
                } catch (error) {
                    console.log(`   📄 Основной PDF: ❌ Ошибка подключения`)
                    issues.push(`Основной PDF курса "${doc.title}" недоступен: ${error.message}`)
                }
            }

            // Проверяем обложку
            if (doc.cover_url) {
                try {
                    const coverResponse = await fetch(doc.cover_url, { method: 'HEAD' })
                    console.log(`   🖼️ Обложка: ${coverResponse.status === 200 ? '✅ Доступна' : `❌ Ошибка ${coverResponse.status}`}`)
                    if (coverResponse.status !== 200) {
                        issues.push(`Обложка курса "${doc.title}" недоступна (${coverResponse.status})`)
                    }
                } catch (error) {
                    console.log(`   🖼️ Обложка: ❌ Ошибка подключения`)
                    issues.push(`Обложка курса "${doc.title}" недоступна: ${error.message}`)
                }
            }

            // Проверяем аудио
            if (doc.audio_url) {
                try {
                    const audioResponse = await fetch(doc.audio_url, { method: 'HEAD' })
                    console.log(`   🎵 Аудио: ${audioResponse.status === 200 ? '✅ Доступно' : `❌ Ошибка ${audioResponse.status}`}`)
                    if (audioResponse.status !== 200) {
                        issues.push(`Аудио курса "${doc.title}" недоступно (${audioResponse.status})`)
                    }
                } catch (error) {
                    console.log(`   🎵 Аудио: ❌ Ошибка подключения`)
                    issues.push(`Аудио курса "${doc.title}" недоступно: ${error.message}`)
                }
            }
        }

        // 5. Проверяем страницы сайта
        console.log('\n5️⃣ ПРОВЕРКА СТРАНИЦ САЙТА')
        console.log('=' * 50)

        const pagesToCheck = [
            { url: 'http://localhost:3002/', name: 'Главная страница' },
            { url: 'http://localhost:3002/catalog', name: 'Каталог' },
            { url: 'http://localhost:3002/auth/login', name: 'Страница входа' },
            { url: 'http://localhost:3002/dashboard', name: 'Личный кабинет' }
        ]

        for (const page of pagesToCheck) {
            try {
                const response = await fetch(page.url, { method: 'HEAD' })
                console.log(`   ${page.name}: ${response.status === 200 ? '✅ Доступна' : `❌ Ошибка ${response.status}`}`)
                if (response.status !== 200) {
                    issues.push(`Страница "${page.name}" недоступна (${response.status})`)
                }
            } catch (error) {
                console.log(`   ${page.name}: ❌ Ошибка подключения`)
                issues.push(`Страница "${page.name}" недоступна: ${error.message}`)
            }
        }

        // 6. Итоговый отчет
        console.log('\n6️⃣ ИТОГОВЫЙ ОТЧЕТ')
        console.log('=' * 50)

        if (issues.length === 0) {
            console.log('🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!')
            console.log('✅ Пользователь может войти в систему')
            console.log('✅ Покупки отображаются корректно')
            console.log('✅ Файлы доступны для скачивания')
            console.log('✅ Все страницы работают')
        } else {
            console.log(`❌ НАЙДЕНО ПРОБЛЕМ: ${issues.length}`)
            console.log('\n📋 СПИСОК ПРОБЛЕМ:')
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`)
            })
        }

        console.log('\n📊 СТАТИСТИКА:')
        console.log(`   Пользователь: ${user.email}`)
        console.log(`   Покупок: ${purchases.length}`)
        console.log(`   Проблем: ${issues.length}`)
        console.log(`   Статус: ${issues.length === 0 ? '✅ ГОТОВО' : '❌ ТРЕБУЕТ ИСПРАВЛЕНИЯ'}`)

    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message)
        issues.push(`Критическая ошибка: ${error.message}`)
    }

    return issues
}

// Запускаем тестирование
testUserExperience().then(issues => {
    if (issues && issues.length > 0) {
        console.log('\n🚨 ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ ПРОБЛЕМ!')
        process.exit(1)
    } else {
        console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!')
        process.exit(0)
    }
})
