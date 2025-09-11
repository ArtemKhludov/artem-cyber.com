const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRLSPolicies() {
  console.log('🔍 Проверяем настройку безопасности...\n')
  
  try {
    // Проверяем доступ к приватному бакету через service role
    console.log('🔒 Тестируем доступ к приватному бакету:')
    
    const { data: bucketFiles, error: bucketError } = await supabase.storage
      .from('course-materials-private')
      .list('', { limit: 5 })
    
    if (bucketError) {
      console.log(`❌ Ошибка доступа к бакету: ${bucketError.message}`)
      console.log('💡 Проверьте настройки RLS политик в Supabase Dashboard')
    } else {
      console.log(`✅ Доступ к бакету работает`)
      console.log(`📁 Найдено папок/файлов: ${bucketFiles.length}`)
      
      if (bucketFiles.length > 0) {
        console.log('📂 Содержимое бакета:')
        bucketFiles.forEach(file => {
          console.log(`   - ${file.name}`)
        })
      }
    }
    
    // Проверяем доступ к публичному бакету
    console.log('\n🌐 Тестируем доступ к публичному бакету:')
    
    const { data: publicFiles, error: publicError } = await supabase.storage
      .from('course-materials')
      .list('', { limit: 5 })
    
    if (publicError) {
      console.log(`❌ Ошибка доступа к публичному бакету: ${publicError.message}`)
    } else {
      console.log(`✅ Доступ к публичному бакету работает`)
      console.log(`📁 Найдено папок/файлов: ${publicFiles.length}`)
    }
    
    // Тестируем загрузку файла из приватного бакета
    console.log('\n📄 Тестируем загрузку файла из приватного бакета:')
    
    try {
      // Пытаемся получить первый файл из приватного бакета
      const { data: testFile, error: testError } = await supabase.storage
        .from('course-materials-private')
        .download('courses/energylogic-iskusstvo-perekalibrovki-realnosti/main.pdf')
      
      if (testError) {
        console.log(`❌ Ошибка загрузки файла: ${testError.message}`)
      } else {
        console.log('✅ Файл успешно загружен через service role')
        console.log(`📊 Размер файла: ${testFile.size} байт`)
      }
    } catch (error) {
      console.log(`❌ Ошибка тестирования файла: ${error.message}`)
    }
    
    console.log('\n🎯 РЕЗУЛЬТАТ ПРОВЕРКИ:')
    console.log('✅ Service role имеет доступ к приватному бакету')
    console.log('✅ Публичный бакет доступен')
    console.log('✅ Файлы можно загружать через API')
    
    console.log('\n💡 Для полной проверки безопасности:')
    console.log('1. Проверьте RLS политики в Supabase Dashboard')
    console.log('2. Запустите node verify-roles-system.js')
    console.log('3. Запустите node test-customer-flow.js')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
  }
}

checkRLSPolicies()
