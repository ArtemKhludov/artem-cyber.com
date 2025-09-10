const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testPurchaseSystem() {
  console.log('🧪 Тестирование системы покупок...\n')

  try {
    // 1. Проверяем структуру таблиц
    console.log('1️⃣ Проверка структуры таблиц...')
    
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, course_type, has_workbook, has_videos, has_audio, video_count, workbook_count')
      .limit(5)

    if (docsError) {
      console.error('❌ Ошибка получения документов:', docsError)
    } else {
      console.log('✅ Документы получены:', documents?.length || 0)
      documents?.forEach(doc => {
        console.log(`   - ${doc.title} (${doc.course_type})`)
        console.log(`     Рабочие тетради: ${doc.has_workbook ? doc.workbook_count : 0}`)
        console.log(`     Видео: ${doc.has_videos ? doc.video_count : 0}`)
        console.log(`     Аудио: ${doc.has_audio ? 'Да' : 'Нет'}`)
      })
    }

    // 2. Проверяем существующие покупки
    console.log('\n2️⃣ Проверка существующих покупок...')
    
    const { data: purchases, error: purchasesError } = await supabase
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
      .limit(10)

    if (purchasesError) {
      console.error('❌ Ошибка получения покупок:', purchasesError)
    } else {
      console.log('✅ Покупки получены:', purchases?.length || 0)
      purchases?.forEach(purchase => {
        console.log(`   - ${purchase.user_email}: ${purchase.documents?.title || 'Неизвестный курс'}`)
        console.log(`     Статус: ${purchase.payment_status}, Сумма: ${purchase.amount_paid} ₽`)
      })
    }

    // 3. Проверяем заказы (сессии)
    console.log('\n3️⃣ Проверка заказов (сессий)...')
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, amount, status, pdf_url, created_at')
      .limit(5)

    if (ordersError) {
      console.error('❌ Ошибка получения заказов:', ordersError)
    } else {
      console.log('✅ Заказы получены:', orders?.length || 0)
      orders?.forEach(order => {
        console.log(`   - Заказ ${order.id}: ${order.amount} ₽, статус: ${order.status}`)
        console.log(`     PDF: ${order.pdf_url ? 'Есть' : 'Нет'}`)
      })
    }

    // 4. Проверяем пользователей
    console.log('\n4️⃣ Проверка пользователей...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .limit(5)

    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError)
    } else {
      console.log('✅ Пользователи получены:', users?.length || 0)
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.name || 'Без имени'}) - ${user.role}`)
      })
    }

    // 5. Тестируем API дашборда
    console.log('\n5️⃣ Тестирование API дашборда...')
    
    if (users && users.length > 0) {
      const testUser = users[0]
      console.log(`   Тестируем для пользователя: ${testUser.email}`)
      
      // Симулируем запрос к API дашборда
      const { data: userPurchases, error: userPurchasesError } = await supabase
        .from('purchases')
        .select(`
          id,
          document_id,
          payment_method,
          payment_status,
          amount_paid,
          currency,
          created_at,
          updated_at,
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
            workbook_count,
            course_duration_minutes
          )
        `)
        .eq('user_email', testUser.email)
        .eq('payment_status', 'completed')

      if (userPurchasesError) {
        console.error('❌ Ошибка получения покупок пользователя:', userPurchasesError)
      } else {
        console.log(`   ✅ Покупки пользователя: ${userPurchases?.length || 0}`)
        userPurchases?.forEach(purchase => {
          console.log(`     - ${purchase.documents?.title || 'Неизвестный курс'}`)
          console.log(`       Тип: ${purchase.documents?.course_type || 'pdf'}`)
          console.log(`       Материалы: PDF${purchase.documents?.has_workbook ? ', тетради' : ''}${purchase.documents?.has_videos ? ', видео' : ''}${purchase.documents?.has_audio ? ', аудио' : ''}`)
        })
      }
    }

    console.log('\n🎉 Тестирование завершено!')

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

// Запускаем тестирование
testPurchaseSystem()
