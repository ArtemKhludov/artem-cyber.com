const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testCourseAPI() {
  console.log('🧪 Тестируем API курса...\n')

  try {
    // 1. Получаем пользователя и его покупки
    console.log('👤 Получаем пользователя и покупки...')
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        user_email,
        document_id,
        documents (title)
      `)
      .eq('user_email', 'user@test.com')
      .eq('payment_status', 'completed')
      .limit(1)
      .single()

    if (purchasesError || !purchases) {
      console.log('❌ Ошибка получения покупок:', purchasesError?.message)
      return
    }

    console.log(`✅ Найден пользователь: ${purchases.user_email}`)
    console.log(`📚 Курс: ${purchases.documents.title}`)
    console.log(`🆔 Course ID: ${purchases.document_id}`)

    // 2. Создаем сессию для тестирования
    console.log('\n🔐 Создаем тестовую сессию...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'user@test.com')
      .single()

    if (userError || !user) {
      console.log('❌ Пользователь не найден')
      return
    }

    const sessionToken = 'test-session-' + Date.now()
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        session_token: sessionToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date().toISOString()
      })

    if (sessionError) {
      console.log('⚠️ Сессия уже существует, продолжаем...')
    } else {
      console.log('✅ Тестовая сессия создана')
    }

    // 3. Тестируем API outline
    console.log('\n📋 Тестируем API outline...')
    const outlineResponse = await fetch(`http://localhost:3000/api/courses/${purchases.document_id}/outline`, {
      headers: {
        'Cookie': `session_token=${sessionToken}`
      }
    })

    console.log(`📊 Статус ответа: ${outlineResponse.status}`)
    
    if (outlineResponse.ok) {
      const outlineData = await outlineResponse.json()
      console.log('✅ API outline работает')
      console.log(`   📚 Курс: ${outlineData.course.title}`)
      console.log(`   📝 Элементов: ${outlineData.items.length}`)
      
      outlineData.items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} (${item.type}) - ${item.progress.status}`)
      })
    } else {
      const errorText = await outlineResponse.text()
      console.log(`❌ API outline не работает: ${outlineResponse.status}`)
      console.log(`   Ошибка: ${errorText}`)
    }

    // 4. Тестируем API state
    console.log('\n📊 Тестируем API state...')
    const stateResponse = await fetch(`http://localhost:3000/api/courses/${purchases.document_id}/state`, {
      headers: {
        'Cookie': `session_token=${sessionToken}`
      }
    })

    console.log(`📊 Статус ответа: ${stateResponse.status}`)
    
    if (stateResponse.ok) {
      const stateData = await stateResponse.json()
      console.log('✅ API state работает')
      console.log(`   📈 Общий прогресс: ${stateData.overall_progress}%`)
      console.log(`   🏆 Достижений: ${stateData.achievements.length}`)
      if (stateData.last_opened_item) {
        console.log(`   📍 Последний элемент: ${stateData.last_opened_item.title}`)
      }
    } else {
      const errorText = await stateResponse.text()
      console.log(`❌ API state не работает: ${stateResponse.status}`)
      console.log(`   Ошибка: ${errorText}`)
    }

    // 5. Очищаем тестовую сессию
    console.log('\n🧹 Очищаем тестовую сессию...')
    await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken)
    console.log('✅ Тестовая сессия удалена')

    console.log('\n🎉 Тестирование API курса завершено!')

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message)
  }
}

// Запускаем тест
testCourseAPI()
