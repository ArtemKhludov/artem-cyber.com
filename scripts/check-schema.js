const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mcexzjzowwanxawbiizd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  try {
    console.log('🔍 Проверяем структуру таблицы documents...')
    
    // Пробуем вставить тестовую запись, чтобы увидеть ошибку с полными полями
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: 'Test',
        description: 'Test description',
        price_rub: 100,
        file_url: 'test.pdf',
        cover_url: 'test.png'
      })
      .select()
    
    if (error) {
      console.error('❌ Ошибка:', error)
      
      // Попробуем с price вместо price_rub
      console.log('🔄 Пробуем с полем price...')
      const { data: data2, error: error2 } = await supabase
        .from('documents')
        .insert({
          title: 'Test',
          description: 'Test description',
          price: 100,
          file_url: 'test.pdf',
          cover_url: 'test.png'
        })
        .select()
      
      if (error2) {
        console.error('❌ Ошибка с price:', error2)
      } else {
        console.log('✅ Структура использует поле price:', data2)
        
        // Удаляем тестовую запись
        await supabase
          .from('documents')
          .delete()
          .eq('id', data2[0].id)
        
        console.log('🧹 Тестовая запись удалена')
      }
    } else {
      console.log('✅ Структура использует поле price_rub:', data)
      
      // Удаляем тестовую запись
      await supabase
        .from('documents')
        .delete()
        .eq('id', data[0].id)
      
      console.log('🧹 Тестовая запись удалена')
    }
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error)
  }
}

checkSchema()
