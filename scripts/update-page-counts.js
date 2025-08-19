const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mcexzjzowwanxawbiizd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'
);

async function updatePageCounts() {
  console.log('📄 Обновляем количество страниц для всех PDF документов...');
  
  try {
    // Получаем все документы
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, title, file_url')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки документов:', error);
      return;
    }

    console.log(`📋 Найдено ${documents.length} документов для анализа`);

    for (const doc of documents) {
      if (!doc.file_url) {
        console.log(`⚠️ Пропускаем "${doc.title}" - нет URL файла`);
        continue;
      }

      try {
        console.log(`🔍 Анализируем "${doc.title}"...`);
        
        // Вызываем наш API для определения количества страниц
        const response = await fetch(`http://localhost:3000/api/pdf/pages?url=${encodeURIComponent(doc.file_url)}`);
        const data = await response.json();

        if (data.success && data.pageCount) {
          // Обновляем запись в базе данных
          const { error: updateError } = await supabase
            .from('documents')
            .update({ page_count: data.pageCount })
            .eq('id', doc.id);

          if (updateError) {
            console.error(`❌ Ошибка обновления "${doc.title}":`, updateError);
          } else {
            console.log(`✅ "${doc.title}": ${data.pageCount} страниц (${data.method}${data.fileSizeMB ? `, ${data.fileSizeMB}MB` : ''})`);
          }
        } else {
          console.log(`⚠️ Не удалось определить количество страниц для "${doc.title}"`);
        }

        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (docError) {
        console.error(`❌ Ошибка анализа "${doc.title}":`, docError.message);
      }
    }

    console.log('✅ Обновление завершено!');

  } catch (error) {
    console.error('🚨 Общая ошибка:', error);
  }
}

// Проверяем, есть ли колонка page_count в таблице
async function checkAndAddPageCountColumn() {
  try {
    console.log('🔧 Проверяем структуру таблицы documents...');
    
    // Пытаемся сделать SELECT с полем page_count
    const { error } = await supabase
      .from('documents')
      .select('page_count')
      .limit(1);

    if (error && error.message.includes('column "page_count" does not exist')) {
      console.log('📝 Добавляем колонку page_count в таблицу documents...');
      console.log('⚠️ ВНИМАНИЕ: Нужно выполнить SQL команду в Supabase Dashboard:');
      console.log('   ALTER TABLE documents ADD COLUMN page_count INTEGER;');
      console.log('');
      console.log('После добавления колонки запустите скрипт снова.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки структуры таблицы:', error);
    return false;
  }
}

async function main() {
  const canProceed = await checkAndAddPageCountColumn();
  
  if (canProceed) {
    await updatePageCounts();
  }
}

main();
