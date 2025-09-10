require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addCourseToUser() {
    console.log('🎯 Добавление курса для пользователя user@test.com...\n')

    try {
        // 1. Получаем пользователя
        console.log('1️⃣ Получение пользователя...')
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'user@test.com')

        if (usersError) {
            console.error('❌ Ошибка получения пользователя:', usersError)
            return
        }

        if (!users || users.length === 0) {
            console.error('❌ Пользователь user@test.com не найден')
            return
        }

        const user = users[0]
        console.log(`✅ Пользователь найден: ${user.email} (ID: ${user.id})`)

        // 2. Получаем доступные курсы
        console.log('\n2️⃣ Получение доступных курсов...')
        const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('course_type', 'mini_course')
            .order('created_at', { ascending: false })

        if (docsError) {
            console.error('❌ Ошибка получения документов:', docsError)
            return
        }

        if (!documents || documents.length === 0) {
            console.error('❌ Курсы не найдены')
            return
        }

        console.log(`✅ Найдено курсов: ${documents.length}`)
        documents.forEach((doc, index) => {
            console.log(`   ${index + 1}. ${doc.title} - ${doc.price_rub} ₽`)
        })

        // 3. Выбираем первый курс для добавления
        const selectedCourse = documents[0]
        console.log(`\n3️⃣ Выбран курс: ${selectedCourse.title}`)

        // 4. Проверяем, есть ли уже покупка этого курса
        console.log('\n4️⃣ Проверка существующих покупок...')
        const { data: existingPurchases, error: purchasesError } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_email', 'user@test.com')
            .eq('document_id', selectedCourse.id)

        if (purchasesError) {
            console.error('❌ Ошибка проверки покупок:', purchasesError)
            return
        }

        if (existingPurchases && existingPurchases.length > 0) {
            console.log('⚠️ Покупка этого курса уже существует')
            console.log(`   Статус: ${existingPurchases[0].payment_status}`)
            console.log(`   Сумма: ${existingPurchases[0].amount_paid} ${existingPurchases[0].currency}`)
            return
        }

        // 5. Создаем новую покупку
        console.log('\n5️⃣ Создание новой покупки...')
        const { data: newPurchase, error: createError } = await supabase
            .from('purchases')
            .insert({
                document_id: selectedCourse.id,
                user_email: 'user@test.com',
                payment_method: 'stripe',
                payment_status: 'completed',
                amount_paid: selectedCourse.price_rub,
                currency: 'RUB',
                user_country: 'RU',
                user_ip: '127.0.0.1'
            })
            .select()

        if (createError) {
            console.error('❌ Ошибка создания покупки:', createError)
            return
        }

        console.log('✅ Покупка создана успешно!')
        console.log(`   ID: ${newPurchase[0].id}`)
        console.log(`   Курс: ${selectedCourse.title}`)
        console.log(`   Сумма: ${selectedCourse.price_rub} ₽`)
        console.log(`   Статус: completed`)

        // 6. Проверяем результат
        console.log('\n6️⃣ Проверка результата...')
        const { data: userPurchases, error: checkError } = await supabase
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
          course_type,
          has_workbook,
          has_videos,
          has_audio,
          video_count,
          workbook_count
        )
      `)
            .eq('user_email', 'user@test.com')
            .eq('payment_status', 'completed')

        if (checkError) {
            console.error('❌ Ошибка проверки:', checkError)
            return
        }

        console.log(`✅ Всего покупок у пользователя: ${userPurchases.length}`)
        userPurchases.forEach((purchase, index) => {
            const doc = purchase.documents
            console.log(`   ${index + 1}. ${doc.title}`)
            console.log(`      Тип: ${doc.course_type}`)
            console.log(`      Цена: ${doc.price_rub} ₽`)
            console.log(`      Материалы: PDF${doc.has_workbook ? ', тетради' : ''}${doc.has_videos ? ', видео' : ''}${doc.has_audio ? ', аудио' : ''}`)
            console.log(`      Статус: ${purchase.payment_status}`)
        })

        console.log('\n🎉 Курс успешно добавлен для пользователя user@test.com!')

    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message)
    }
}

// Запускаем добавление курса
addCourseToUser()
