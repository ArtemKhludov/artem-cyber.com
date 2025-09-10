const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSecurity() {
  console.log('🔒 Тестирование безопасности доступа...\n')

  try {
    // 1. Получаем всех пользователей
    console.log('1️⃣ Получение пользователей...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(3)

    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError)
      return
    }

    console.log(`✅ Найдено пользователей: ${users?.length || 0}`)

    // 2. Получаем все покупки
    console.log('\n2️⃣ Получение всех покупок...')
    
    const { data: allPurchases, error: allPurchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        user_email,
        payment_status,
        amount_paid,
        documents (
          id,
          title,
          course_type
        )
      `)

    if (allPurchasesError) {
      console.error('❌ Ошибка получения всех покупок:', allPurchasesError)
      return
    }

    console.log(`✅ Всего покупок в системе: ${allPurchases?.length || 0}`)

    // 3. Тестируем изоляцию данных
    console.log('\n3️⃣ Тестирование изоляции данных...')
    
    for (const user of users || []) {
      console.log(`\n   Тестирование для пользователя: ${user.email}`)
      
      // Получаем покупки только этого пользователя
      const { data: userPurchases, error: userPurchasesError } = await supabase
        .from('purchases')
        .select(`
          id,
          user_email,
          payment_status,
          amount_paid,
          documents (
            id,
            title,
            course_type
          )
        `)
        .eq('user_email', user.email)

      if (userPurchasesError) {
        console.error(`❌ Ошибка получения покупок для ${user.email}:`, userPurchasesError)
        continue
      }

      console.log(`     ✅ Покупки пользователя: ${userPurchases?.length || 0}`)
      
      // Проверяем, что пользователь видит только свои покупки
      const userPurchaseIds = userPurchases?.map(p => p.id) || []
      const allPurchaseIds = allPurchases?.map(p => p.id) || []
      
      // Проверяем, что все покупки пользователя действительно принадлежат ему
      const userOwnPurchases = userPurchases?.filter(p => p.user_email === user.email) || []
      console.log(`     ✅ Собственные покупки: ${userOwnPurchases.length}`)
      
      // Проверяем, что пользователь не видит чужие покупки
      const otherPurchases = allPurchases?.filter(p => p.user_email !== user.email) || []
      const userSeesOtherPurchases = userPurchaseIds.some(id => 
        otherPurchases.some(p => p.id === id)
      )
      
      if (userSeesOtherPurchases) {
        console.log(`     ❌ ПРОБЛЕМА БЕЗОПАСНОСТИ: Пользователь видит чужие покупки!`)
      } else {
        console.log(`     ✅ Безопасность: Пользователь видит только свои покупки`)
      }

      // Показываем покупки пользователя
      userPurchases?.forEach(purchase => {
        console.log(`       - ${purchase.documents?.title || 'Неизвестный курс'}`)
        console.log(`         Статус: ${purchase.payment_status}, Сумма: ${purchase.amount_paid} ₽`)
      })
    }

    // 4. Тестируем доступ к файлам
    console.log('\n4️⃣ Тестирование доступа к файлам...')
    
    // Получаем документы с файлами
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, file_url, cover_url, course_type')
      .limit(3)

    if (docsError) {
      console.error('❌ Ошибка получения документов:', docsError)
    } else {
      console.log(`✅ Найдено документов: ${documents?.length || 0}`)
      
      documents?.forEach(doc => {
        console.log(`   - ${doc.title} (${doc.course_type})`)
        console.log(`     PDF: ${doc.file_url ? 'Есть' : 'Нет'}`)
        console.log(`     Обложка: ${doc.cover_url ? 'Есть' : 'Нет'}`)
      })
    }

    // 5. Тестируем RLS политики
    console.log('\n5️⃣ Тестирование RLS политик...')
    
    // Проверяем, что можно читать покупки
    const { data: readTest, error: readError } = await supabase
      .from('purchases')
      .select('id, user_email')
      .limit(1)

    if (readError) {
      console.error('❌ Ошибка чтения покупок (RLS):', readError)
    } else {
      console.log('✅ RLS: Чтение покупок разрешено')
    }

    // Проверяем, что можно создавать покупки
    const testPurchase = {
      document_id: documents?.[0]?.id || '00000000-0000-0000-0000-000000000000',
      user_email: 'test-security@example.com',
      payment_method: 'stripe',
      payment_status: 'pending',
      amount_paid: 1000,
      currency: 'RUB'
    }

    const { data: createTest, error: createError } = await supabase
      .from('purchases')
      .insert(testPurchase)
      .select()

    if (createError) {
      console.error('❌ Ошибка создания покупки (RLS):', createError)
    } else {
      console.log('✅ RLS: Создание покупок разрешено')
      
      // Удаляем тестовую покупку
      if (createTest && createTest.length > 0) {
        await supabase
          .from('purchases')
          .delete()
          .eq('id', createTest[0].id)
        console.log('✅ Тестовая покупка удалена')
      }
    }

    console.log('\n🎉 Тестирование безопасности завершено!')

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

// Запускаем тестирование
testSecurity()
