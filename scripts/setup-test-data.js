const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupTestData() {
  console.log('🔧 Настройка тестовых данных...\n')

  try {
    // 1. Получаем существующие документы
    console.log('1️⃣ Получение существующих документов...')
    
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, course_type, price_rub')
      .limit(3)

    if (docsError) {
      console.error('❌ Ошибка получения документов:', docsError)
      return
    }

    console.log(`✅ Найдено документов: ${documents?.length || 0}`)
    documents?.forEach(doc => {
      console.log(`   - ${doc.title} (${doc.course_type}) - ${doc.price_rub} ₽`)
    })

    // 2. Получаем существующих пользователей
    console.log('\n2️⃣ Получение существующих пользователей...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(3)

    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError)
      return
    }

    console.log(`✅ Найдено пользователей: ${users?.length || 0}`)
    users?.forEach(user => {
      console.log(`   - ${user.email} (${user.name || 'Без имени'})`)
    })

    // 3. Создаем тестовые покупки
    if (documents && documents.length > 0 && users && users.length > 0) {
      console.log('\n3️⃣ Создание тестовых покупок...')
      
      const testPurchases = []
      
      // Создаем покупки для каждого пользователя
      users.forEach((user, userIndex) => {
        documents.forEach((doc, docIndex) => {
          // Создаем покупку только для некоторых комбинаций
          if ((userIndex + docIndex) % 2 === 0) {
            testPurchases.push({
              document_id: doc.id,
              user_email: user.email,
              payment_method: 'stripe',
              payment_status: 'completed',
              amount_paid: doc.price_rub,
              currency: 'RUB',
              user_country: 'RU',
              user_ip: '127.0.0.1'
            })
          }
        })
      })

      console.log(`   Создаем ${testPurchases.length} тестовых покупок...`)

      const { data: createdPurchases, error: createError } = await supabase
        .from('purchases')
        .insert(testPurchases)
        .select()

      if (createError) {
        console.error('❌ Ошибка создания покупок:', createError)
      } else {
        console.log(`✅ Создано покупок: ${createdPurchases?.length || 0}`)
        createdPurchases?.forEach(purchase => {
          console.log(`   - ${purchase.user_email}: ${purchase.amount_paid} ₽`)
        })
      }
    }

    // 4. Проверяем результат
    console.log('\n4️⃣ Проверка результата...')
    
    const { data: allPurchases, error: allPurchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        user_email,
        payment_status,
        amount_paid,
        created_at,
        documents (
          id,
          title,
          course_type
        )
      `)

    if (allPurchasesError) {
      console.error('❌ Ошибка получения всех покупок:', allPurchasesError)
    } else {
      console.log(`✅ Всего покупок в системе: ${allPurchases?.length || 0}`)
      allPurchases?.forEach(purchase => {
        console.log(`   - ${purchase.user_email}: ${purchase.documents?.title || 'Неизвестный курс'}`)
        console.log(`     Статус: ${purchase.payment_status}, Сумма: ${purchase.amount_paid} ₽`)
      })
    }

    console.log('\n🎉 Настройка тестовых данных завершена!')

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

// Запускаем настройку
setupTestData()
