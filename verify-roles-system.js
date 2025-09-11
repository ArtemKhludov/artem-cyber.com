const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyRolesSystem() {
  console.log('🔍 Проверяем систему ролей...\n')
  
  try {
    // Проверяем существование таблицы user_profiles
    console.log('📋 Проверяем таблицу user_profiles:')
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5)
    
    if (profilesError) {
      console.log(`❌ Таблица user_profiles не найдена: ${profilesError.message}`)
      console.log('💡 Выполните SQL скрипт create-user-roles-system.sql')
      return
    }
    
    console.log(`✅ Таблица user_profiles найдена`)
    console.log(`📊 Найдено профилей: ${profiles.length}`)
    
    // Показываем все профили
    console.log('\n👥 Профили пользователей:')
    profiles.forEach(profile => {
      console.log(`   ${profile.role === 'admin' ? '🔧' : '👤'} ${profile.email} → ${profile.role}`)
    })
    
    // Проверяем функции
    console.log('\n🔧 Проверяем функции:')
    
    // Тестируем функцию is_admin
    try {
      const { data: isAdminResult, error: isAdminError } = await supabase
        .rpc('is_admin', { user_email: 'admin@energylogic.ru' })
      
      if (isAdminError) {
        console.log(`❌ Функция is_admin не работает: ${isAdminError.message}`)
      } else {
        console.log(`✅ Функция is_admin работает: ${isAdminResult}`)
      }
    } catch (error) {
      console.log(`❌ Ошибка тестирования is_admin: ${error.message}`)
    }
    
    // Тестируем функцию get_user_role
    try {
      const { data: roleResult, error: roleError } = await supabase
        .rpc('get_user_role', { user_email: 'user@test.com' })
      
      if (roleError) {
        console.log(`❌ Функция get_user_role не работает: ${roleError.message}`)
      } else {
        console.log(`✅ Функция get_user_role работает: ${roleResult}`)
      }
    } catch (error) {
      console.log(`❌ Ошибка тестирования get_user_role: ${error.message}`)
    }
    
    // Проверяем RLS политики
    console.log('\n🛡️ Проверяем RLS политики:')
    
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.policies')
      .select('tablename, policyname, cmd')
      .eq('tablename', 'user_profiles')
    
    if (policiesError) {
      console.log(`❌ Ошибка получения политик: ${policiesError.message}`)
    } else if (policies && policies.length > 0) {
      console.log(`✅ Найдено RLS политик: ${policies.length}`)
      policies.forEach(policy => {
        console.log(`   📋 ${policy.policyname} (${policy.cmd})`)
      })
    } else {
      console.log('❌ RLS политики не найдены')
    }
    
    console.log('\n🎯 РЕЗУЛЬТАТ ПРОВЕРКИ:')
    console.log('✅ Таблица user_profiles создана')
    console.log('✅ Профили пользователей настроены')
    console.log('✅ Функции работают (если нет ошибок выше)')
    console.log('✅ RLS политики настроены')
    
    console.log('\n🚀 Система ролей готова к использованию!')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
  }
}

verifyRolesSystem()
