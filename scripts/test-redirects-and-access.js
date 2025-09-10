require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRedirectsAndAccess() {
    console.log('🔗 ТЕСТИРОВАНИЕ РЕДИРЕКТОВ И ДОСТУПА К ФАЙЛАМ\n')
    console.log('👤 Тестовый пользователь: user@test.com\n')

    const issues = []
    const testResults = []

    try {
        // 1. Получаем покупки пользователя
        console.log('1️⃣ ПОЛУЧЕНИЕ ПОКУПОК ПОЛЬЗОВАТЕЛЯ')
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
            return
        }

        // 2. Тестируем каждый курс
        for (let i = 0; i < purchases.length; i++) {
            const purchase = purchases[i]
            const doc = purchase.documents

            console.log(`\n2️⃣ ТЕСТИРОВАНИЕ КУРСА ${i + 1}: ${doc.title}`)
            console.log('=' * 50)

            const courseResults = {
                course: doc.title,
                issues: [],
                tests: []
            }

            // 2.1. Тестируем страницу курса
            console.log(`\n   📄 Тестирование страницы курса: /pdf/${doc.id}`)
            try {
                const coursePageResponse = await fetch(`http://localhost:3002/pdf/${doc.id}`, { method: 'HEAD' })
                const coursePageStatus = coursePageResponse.status === 200 ? '✅' : '❌'
                console.log(`      Статус: ${coursePageStatus} (${coursePageResponse.status})`)

                courseResults.tests.push({
                    test: 'Страница курса',
                    status: coursePageResponse.status,
                    success: coursePageResponse.status === 200
                })

                if (coursePageResponse.status !== 200) {
                    courseResults.issues.push(`Страница курса недоступна (${coursePageResponse.status})`)
                }
            } catch (error) {
                console.log(`      ❌ Ошибка: ${error.message}`)
                courseResults.issues.push(`Ошибка доступа к странице курса: ${error.message}`)
            }

            // 2.2. Тестируем основной PDF
            if (doc.file_url) {
                console.log(`\n   📄 Тестирование основного PDF`)
                try {
                    const pdfResponse = await fetch(doc.file_url, { method: 'HEAD' })
                    const pdfStatus = pdfResponse.status === 200 ? '✅' : '❌'
                    console.log(`      URL: ${doc.file_url}`)
                    console.log(`      Статус: ${pdfStatus} (${pdfResponse.status})`)

                    courseResults.tests.push({
                        test: 'Основной PDF',
                        status: pdfResponse.status,
                        success: pdfResponse.status === 200,
                        url: doc.file_url
                    })

                    if (pdfResponse.status !== 200) {
                        courseResults.issues.push(`Основной PDF недоступен (${pdfResponse.status})`)
                    }
                } catch (error) {
                    console.log(`      ❌ Ошибка: ${error.message}`)
                    courseResults.issues.push(`Ошибка доступа к основному PDF: ${error.message}`)
                }
            } else {
                console.log(`\n   📄 Основной PDF: ❌ URL отсутствует`)
                courseResults.issues.push('Основной PDF: URL отсутствует')
            }

            // 2.3. Тестируем обложку
            if (doc.cover_url) {
                console.log(`\n   🖼️ Тестирование обложки`)
                try {
                    const coverResponse = await fetch(doc.cover_url, { method: 'HEAD' })
                    const coverStatus = coverResponse.status === 200 ? '✅' : '❌'
                    console.log(`      URL: ${doc.cover_url}`)
                    console.log(`      Статус: ${coverStatus} (${coverResponse.status})`)

                    courseResults.tests.push({
                        test: 'Обложка',
                        status: coverResponse.status,
                        success: coverResponse.status === 200,
                        url: doc.cover_url
                    })

                    if (coverResponse.status !== 200) {
                        courseResults.issues.push(`Обложка недоступна (${coverResponse.status})`)
                    }
                } catch (error) {
                    console.log(`      ❌ Ошибка: ${error.message}`)
                    courseResults.issues.push(`Ошибка доступа к обложке: ${error.message}`)
                }
            } else {
                console.log(`\n   🖼️ Обложка: ❌ URL отсутствует`)
                courseResults.issues.push('Обложка: URL отсутствует')
            }

            // 2.4. Тестируем аудио
            if (doc.audio_url) {
                console.log(`\n   🎵 Тестирование аудио`)
                try {
                    const audioResponse = await fetch(doc.audio_url, { method: 'HEAD' })
                    const audioStatus = audioResponse.status === 200 ? '✅' : '❌'
                    console.log(`      URL: ${doc.audio_url}`)
                    console.log(`      Статус: ${audioStatus} (${audioResponse.status})`)

                    courseResults.tests.push({
                        test: 'Аудио',
                        status: audioResponse.status,
                        success: audioResponse.status === 200,
                        url: doc.audio_url
                    })

                    if (audioResponse.status !== 200) {
                        courseResults.issues.push(`Аудио недоступно (${audioResponse.status})`)
                    }
                } catch (error) {
                    console.log(`      ❌ Ошибка: ${error.message}`)
                    courseResults.issues.push(`Ошибка доступа к аудио: ${error.message}`)
                }
            } else if (doc.has_audio) {
                console.log(`\n   🎵 Аудио: ❌ URL отсутствует, но указано наличие`)
                courseResults.issues.push('Аудио: URL отсутствует, но указано наличие')
            }

            // 2.5. Тестируем видео
            if (doc.video_urls && doc.video_urls.length > 0) {
                console.log(`\n   🎥 Тестирование видео (${doc.video_urls.length} файлов)`)
                for (let j = 0; j < doc.video_urls.length; j++) {
                    const videoUrl = doc.video_urls[j]
                    try {
                        const videoResponse = await fetch(videoUrl, { method: 'HEAD' })
                        const videoStatus = videoResponse.status === 200 ? '✅' : '❌'
                        console.log(`      Видео ${j + 1}: ${videoStatus} (${videoResponse.status})`)
                        console.log(`      URL: ${videoUrl}`)

                        courseResults.tests.push({
                            test: `Видео ${j + 1}`,
                            status: videoResponse.status,
                            success: videoResponse.status === 200,
                            url: videoUrl
                        })

                        if (videoResponse.status !== 200) {
                            courseResults.issues.push(`Видео ${j + 1} недоступно (${videoResponse.status})`)
                        }
                    } catch (error) {
                        console.log(`      Видео ${j + 1}: ❌ Ошибка: ${error.message}`)
                        courseResults.issues.push(`Ошибка доступа к видео ${j + 1}: ${error.message}`)
                    }
                }
            } else if (doc.has_videos) {
                console.log(`\n   🎥 Видео: ❌ URL отсутствуют, но указано наличие`)
                courseResults.issues.push('Видео: URL отсутствуют, но указано наличие')
            }

            // 2.6. Тестируем страницу загрузки
            console.log(`\n   📥 Тестирование страницы загрузки: /download/${purchase.id}`)
            try {
                const downloadPageResponse = await fetch(`http://localhost:3002/download/${purchase.id}`, { method: 'HEAD' })
                const downloadPageStatus = downloadPageResponse.status === 200 ? '✅' : '❌'
                console.log(`      Статус: ${downloadPageStatus} (${downloadPageResponse.status})`)

                courseResults.tests.push({
                    test: 'Страница загрузки',
                    status: downloadPageResponse.status,
                    success: downloadPageResponse.status === 200
                })

                if (downloadPageResponse.status !== 200) {
                    courseResults.issues.push(`Страница загрузки недоступна (${downloadPageResponse.status})`)
                }
            } catch (error) {
                console.log(`      ❌ Ошибка: ${error.message}`)
                courseResults.issues.push(`Ошибка доступа к странице загрузки: ${error.message}`)
            }

            // 2.7. Итоги по курсу
            console.log(`\n   📊 ИТОГИ ПО КУРСУ "${doc.title}":`)
            console.log(`      Тестов пройдено: ${courseResults.tests.length}`)
            console.log(`      Успешных: ${courseResults.tests.filter(t => t.success).length}`)
            console.log(`      Проблем: ${courseResults.issues.length}`)

            if (courseResults.issues.length > 0) {
                console.log(`      Проблемы:`)
                courseResults.issues.forEach((issue, index) => {
                    console.log(`        ${index + 1}. ${issue}`)
                })
            }

            testResults.push(courseResults)
            issues.push(...courseResults.issues)
        }

        // 3. Итоговый отчет
        console.log('\n3️⃣ ИТОГОВЫЙ ОТЧЕТ')
        console.log('=' * 50)

        const totalTests = testResults.reduce((sum, result) => sum + result.tests.length, 0)
        const successfulTests = testResults.reduce((sum, result) => sum + result.tests.filter(t => t.success).length, 0)
        const totalIssues = issues.length

        console.log(`📊 ОБЩАЯ СТАТИСТИКА:`)
        console.log(`   Курсов протестировано: ${testResults.length}`)
        console.log(`   Всего тестов: ${totalTests}`)
        console.log(`   Успешных: ${successfulTests}`)
        console.log(`   Проблем: ${totalIssues}`)
        console.log(`   Успешность: ${totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0}%`)

        if (totalIssues === 0) {
            console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!')
            console.log('✅ Все файлы доступны')
            console.log('✅ Все страницы работают')
            console.log('✅ Редиректы корректны')
        } else {
            console.log(`\n❌ НАЙДЕНО ПРОБЛЕМ: ${totalIssues}`)
            console.log('\n📋 СПИСОК ВСЕХ ПРОБЛЕМ:')
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`)
            })
        }

        console.log('\n📋 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ ПО КУРСАМ:')
        testResults.forEach((result, index) => {
            console.log(`\n   Курс ${index + 1}: ${result.course}`)
            console.log(`      Тестов: ${result.tests.length}`)
            console.log(`      Успешных: ${result.tests.filter(t => t.success).length}`)
            console.log(`      Проблем: ${result.issues.length}`)

            if (result.issues.length > 0) {
                console.log(`      Проблемы:`)
                result.issues.forEach((issue, issueIndex) => {
                    console.log(`        ${issueIndex + 1}. ${issue}`)
                })
            }
        })

    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message)
        issues.push(`Критическая ошибка: ${error.message}`)
    }

    return issues
}

// Запускаем тестирование
testRedirectsAndAccess().then(issues => {
    if (issues && issues.length > 0) {
        console.log('\n🚨 ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ ПРОБЛЕМ!')
        process.exit(1)
    } else {
        console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!')
        process.exit(0)
    }
})
