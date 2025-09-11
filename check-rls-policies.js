const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRLSPolicies() {
  console.log('🔍 Проверяем RLS политики для storage...\n')
  
  try {
    // Проверяем существующие политики для storage.objects
    console.log('📋 Текущие RLS политики для storage.objects:')
    
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.policies')
      .select('tablename, policyname, cmd, roles')
      .eq('tablename', 'objects')
      .eq('schemaname', 'storage')
    
    if (policiesError) {
      console.log(`❌ Ошибка получения политик: ${policiesError.message}`)
      return
    }
    
    if (policies && policies.length > 0) {
      console.log(`✅ Найдено политик: ${policies.length}`)
      
      policies.forEach(policy => {
        const roles = policy.roles || ['all']
        console.log(`   📋 ${policy.policyname}`)
        console.log(`      🔧 Операция: ${policy.cmd}`)
        console.log(`      👥 Роли: ${roles.join(', ')}`)
        console.log('')
      })
      
      // Проверяем наличие нужных политик
      const hasPurchasedAccess = policies.some(p => 
        p.policyname.includes('purchased') || p.policyname.includes('course-materials')
      )
      
      const hasServiceRoleAccess = policies.some(p => 
        p.policyname.includes('service') || p.policyname.includes('service_role')
      )
      
      console.log('🎯 Проверка необходимых политик:')
      console.log(`   ${hasPurchasedAccess ? '✅' : '❌'} Политика доступа для покупателей`)
      console.log(`   ${hasServiceRoleAccess ? '✅' : '❌'} Политика доступа для service_role`)
      
      if (!hasPurchasedAccess || !hasServiceRoleAccess) {
        console.log('\n⚠️  Не все необходимые политики найдены!')
        console.log('💡 Следуйте инструкциям в SETUP_RLS_POLICIES_GUIDE.md')
      } else {
        console.log('\n✅ Все необходимые политики настроены!')
      }
      
    } else {
      console.log('❌ RLS политики не найдены!')
      console.log('💡 Нужно настроить политики через Supabase Dashboard')
      console.log('📖 Следуйте инструкциям в SETUP_RLS_POLICIES_GUIDE.md')
    }
    
    // Проверяем доступ к приватному бакету
    console.log('\n🔒 Тестируем доступ к приватному бакету:')
    
    try {
      const { data: bucketFiles, error: bucketError } = await supabase.storage
        .from('course-materials-private')
        .list('', { limit: 1 })
      
      if (bucketError) {
        console.log(`❌ Ошибка доступа к бакету: ${bucketError.message}`)
      } else {
        console.log(`✅ Доступ к бакету работает (найдено файлов: ${bucketFiles.length})`)
      }
    } catch (error) {
      console.log(`❌ Ошибка тестирования бакета: ${error.message}`)
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
  }
}

checkRLSPolicies()
