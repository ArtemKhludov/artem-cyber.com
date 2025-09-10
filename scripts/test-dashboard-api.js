const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDashboardAPI() {
  console.log('🧪 Тестирование API дашборда...\n')

  try {
    // 1. Получаем пользователей
    console.log('1️⃣ Получение пользователей...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .limit(5)

    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError)
      return
    }

    console.log(`✅ Найдено пользователей: ${users?.length || 0}`)

    // 2. Тестируем API дашборда для каждого пользователя
    for (const user of users || []) {
      console.log(`\n2️⃣ Тестирование для пользователя: ${user.email}`)
      
      // Симулируем запрос к API дашборда
      const { data: purchases, error: purchasesError } = await supabase
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
        .eq('user_email', user.email)
        .eq('payment_status', 'completed')

      if (purchasesError) {
        console.error(`❌ Ошибка получения покупок для ${user.email}:`, purchasesError)
        continue
      }

      console.log(`   ✅ Покупки пользователя: ${purchases?.length || 0}`)
      
      if (purchases && purchases.length > 0) {
        purchases.forEach(purchase => {
          console.log(`     - ${purchase.documents?.title || 'Неизвестный курс'}`)
          console.log(`       Тип: ${purchase.documents?.course_type || 'pdf'}`)
          console.log(`       Цена: ${purchase.amount_paid} ${purchase.currency}`)
          console.log(`       Материалы: PDF${purchase.documents?.has_workbook ? ', тетради' : ''}${purchase.documents?.has_videos ? ', видео' : ''}${purchase.documents?.has_audio ? ', аудио' : ''}`)
        })
      } else {
        console.log(`     Пользователь не имеет покупок`)
      }

      // 3. Тестируем заказы (сессии)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          amount,
          status,
          pdf_url,
          session_date,
          session_time,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)

      if (ordersError) {
        console.error(`❌ Ошибка получения заказов для ${user.email}:`, ordersError)
      } else {
        console.log(`   ✅ Заказы пользователя: ${orders?.length || 0}`)
        orders?.forEach(order => {
          console.log(`     - Заказ ${order.id}: ${order.amount} ₽, статус: ${order.status}`)
        })
      }

      // 4. Форматируем данные как в API
      const formattedPurchases = purchases?.map(purchase => ({
        id: purchase.id,
        product_name: purchase.documents?.title || 'Курс',
        product_type: purchase.documents?.course_type === 'mini_course' ? 'mini_course' : 'pdf',
        price: purchase.amount_paid,
        status: purchase.payment_status === 'completed' ? 'completed' : 'pending',
        created_at: purchase.created_at,
        document: purchase.documents,
        progress: 0
      })) || []

      const formattedOrders = orders?.map(order => ({
        id: order.id,
        product_name: 'Энергетическая диагностика',
        product_type: 'session',
        price: order.amount,
        status: order.status === 'completed' ? 'completed' : 'pending',
        created_at: order.created_at,
        pdf_url: order.pdf_url,
        session_date: order.session_date,
        session_time: order.session_time,
        progress: order.status === 'completed' ? 100 : 0
      })) || []

      // 5. Вычисляем статистику
      const totalPurchases = purchases?.length || 0
      const totalOrders = orders?.length || 0
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0
      const totalSpent = (purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0) + 
                        (orders?.reduce((sum, o) => sum + o.amount, 0) || 0)

      console.log(`   📊 Статистика:`)
      console.log(`     Всего покупок: ${totalPurchases + totalOrders}`)
      console.log(`     Курсы: ${totalPurchases}`)
      console.log(`     Завершено: ${completedOrders}`)
      console.log(`     Потрачено: ${totalSpent} ₽`)

      // 6. Проверяем форматированные данные
      console.log(`   📋 Форматированные данные:`)
      console.log(`     Покупки: ${formattedPurchases.length}`)
      console.log(`     Заказы: ${formattedOrders.length}`)
    }

    console.log('\n🎉 Тестирование API дашборда завершено!')

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

// Запускаем тестирование
testDashboardAPI()
