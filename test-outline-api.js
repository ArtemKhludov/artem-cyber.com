const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testOutlineAPI() {
  console.log('🧪 Тестируем API outline курса...\n')

  try {
    // 1. Получаем сессию пользователя
    console.log('1️⃣ Получаем сессию пользователя...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'user@test.com')
      .single()

    if (userError || !user) {
      console.log('❌ Пользователь не найден:', userError?.message)
      return
    }

    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('session_token')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      console.log('❌ Сессия не найдена:', sessionError?.message)
      return
    }

    console.log(`✅ Сессия найдена: ${session.session_token.substring(0, 20)}...`)

    // 2. Получаем курс пользователя
    console.log('\n2️⃣ Получаем курс пользователя...')
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('document_id')
      .eq('user_email', 'user@test.com')
      .eq('payment_status', 'completed')
      .limit(1)
      .single()

    if (purchaseError || !purchase) {
      console.log('❌ Покупка не найдена:', purchaseError?.message)
      return
    }

    const courseId = purchase.document_id
    console.log(`✅ Курс найден: ${courseId}`)

    // 3. Тестируем запрос элементов курса
    console.log('\n3️⃣ Тестируем запрос элементов курса...')
    const { data: courseItems, error: itemsError } = await supabase
      .from('course_items')
      .select(`
        *,
        user_progress!left (
          status,
          progress_pct,
          last_position_sec,
          last_page,
          updated_at
        )
      `)
      .eq('course_id', courseId)
      .eq('user_progress.user_email', 'user@test.com')
      .order('order_index', { ascending: true })

    if (itemsError) {
      console.log('❌ Ошибка получения элементов курса:', itemsError.message)
      console.log('Детали ошибки:', itemsError)
    } else {
      console.log(`✅ Найдено элементов курса: ${courseItems.length}`)
      courseItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} (${item.type}) - Прогресс: ${item.user_progress?.[0]?.progress_pct || 0}%`)
      })
    }

    // 4. Проверяем структуру таблицы user_progress
    console.log('\n4️⃣ Проверяем структуру таблицы user_progress...')
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_email', 'user@test.com')
      .limit(3)

    if (progressError) {
      console.log('❌ Ошибка получения прогресса:', progressError.message)
    } else {
      console.log(`✅ Найдено записей прогресса: ${progress.length}`)
      if (progress.length > 0) {
        console.log('Пример записи:', progress[0])
      }
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  }
}

testOutlineAPI()
