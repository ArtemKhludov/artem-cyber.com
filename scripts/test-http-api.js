// Используем встроенный fetch (Node.js 18+)

async function testHTTPAPI() {
    console.log('🌐 Тестирование HTTP API дашборда...\n')

    try {
        // Тестируем API дашборда
        console.log('1️⃣ Тестирование /api/user/dashboard...')

        const response = await fetch('http://localhost:3002/api/user/dashboard', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Добавляем тестовый session token (если нужен)
                'Cookie': 'session_token=test-session-token'
            }
        })

        console.log(`   Статус ответа: ${response.status}`)

        if (response.ok) {
            const data = await response.json()
            console.log('✅ API дашборда работает!')
            console.log(`   Пользователь: ${data.user?.email || 'Не найден'}`)
            console.log(`   Покупки: ${data.purchases?.length || 0}`)
            console.log(`   Курсы: ${data.courses?.length || 0}`)
            console.log(`   Статистика:`, data.stats)
        } else {
            const errorText = await response.text()
            console.log(`❌ Ошибка API: ${response.status}`)
            console.log(`   Ответ: ${errorText}`)
        }

        // Тестируем API курсов
        console.log('\n2️⃣ Тестирование /api/documents...')

        const documentsResponse = await fetch('http://localhost:3002/api/documents', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        console.log(`   Статус ответа: ${documentsResponse.status}`)

        if (documentsResponse.ok) {
            const documents = await documentsResponse.json()
            console.log('✅ API документов работает!')
            console.log(`   Документов: ${Array.isArray(documents) ? documents.length : 'Не массив'}`)
            if (Array.isArray(documents) && documents.length > 0) {
                documents.slice(0, 3).forEach(doc => {
                    console.log(`   - ${doc.title} (${doc.course_type})`)
                })
            }
        } else {
            const errorText = await documentsResponse.text()
            console.log(`❌ Ошибка API документов: ${documentsResponse.status}`)
            console.log(`   Ответ: ${errorText}`)
        }

        // Тестируем API покупок
        console.log('\n3️⃣ Тестирование /api/purchases...')

        const purchasesResponse = await fetch('http://localhost:3002/api/purchases', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        console.log(`   Статус ответа: ${purchasesResponse.status}`)

        if (purchasesResponse.ok) {
            const purchases = await purchasesResponse.json()
            console.log('✅ API покупок работает!')
            console.log(`   Покупок: ${purchases.length}`)
        } else {
            const errorText = await purchasesResponse.text()
            console.log(`❌ Ошибка API покупок: ${purchasesResponse.status}`)
            console.log(`   Ответ: ${errorText}`)
        }

        console.log('\n🎉 Тестирование HTTP API завершено!')

    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message)
    }
}

// Запускаем тестирование
testHTTPAPI()
