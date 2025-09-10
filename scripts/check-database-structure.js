const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatabaseStructure() {
  console.log('🔍 Проверка структуры базы данных...\n')

  try {
    // Проверяем структуру таблицы purchases
    console.log('1️⃣ Структура таблицы purchases...')
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .limit(1)

    if (purchasesError) {
      console.error('❌ Ошибка получения purchases:', purchasesError)
    } else {
      console.log('✅ Структура purchases:')
      if (purchases && purchases.length > 0) {
        console.log('   Колонки:', Object.keys(purchases[0]).join(', '))
      } else {
        console.log('   Таблица пуста')
      }
    }

    // Проверяем структуру таблицы documents
    console.log('\n2️⃣ Структура таблицы documents...')
    
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1)

    if (docsError) {
      console.error('❌ Ошибка получения documents:', docsError)
    } else {
      console.log('✅ Структура documents:')
      if (documents && documents.length > 0) {
        console.log('   Колонки:', Object.keys(documents[0]).join(', '))
      } else {
        console.log('   Таблица пуста')
      }
    }

    // Проверяем структуру таблицы orders
    console.log('\n3️⃣ Структура таблицы orders...')
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)

    if (ordersError) {
      console.error('❌ Ошибка получения orders:', ordersError)
    } else {
      console.log('✅ Структура orders:')
      if (orders && orders.length > 0) {
        console.log('   Колонки:', Object.keys(orders[0]).join(', '))
      } else {
        console.log('   Таблица пуста')
      }
    }

    // Проверяем структуру таблицы users
    console.log('\n4️⃣ Структура таблицы users...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (usersError) {
      console.error('❌ Ошибка получения users:', usersError)
    } else {
      console.log('✅ Структура users:')
      if (users && users.length > 0) {
        console.log('   Колонки:', Object.keys(users[0]).join(', '))
      } else {
        console.log('   Таблица пуста')
      }
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

// Запускаем проверку
checkDatabaseStructure()
