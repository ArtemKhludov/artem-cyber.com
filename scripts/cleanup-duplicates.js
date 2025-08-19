const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mcexzjzowwanxawbiizd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'
);

async function cleanupDuplicates() {
  console.log('🔍 Анализируем дубликаты...');
  
  try {
    // Получаем все документы
    const { data: allDocs, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false }); // Сначала новые

    if (error) {
      console.error('❌ Ошибка получения документов:', error);
      return;
    }

    console.log(`📊 Всего документов: ${allDocs.length}`);

    // Группируем по названию (title)
    const groupedDocs = {};
    allDocs.forEach(doc => {
      if (!groupedDocs[doc.title]) {
        groupedDocs[doc.title] = [];
      }
      groupedDocs[doc.title].push(doc);
    });

    console.log(`📚 Уникальных названий: ${Object.keys(groupedDocs).length}`);

    // Определяем, что удалять
    const idsToKeep = [];
    const idsToDelete = [];

    Object.entries(groupedDocs).forEach(([title, docs]) => {
      console.log(`\n📄 "${title}"`);
      console.log(`   Копий: ${docs.length}`);
      
      if (docs.length === 1) {
        console.log(`   ✅ Дубликатов нет, оставляем: ${docs[0].id}`);
        idsToKeep.push(docs[0].id);
      } else {
        // Сортируем по дате создания (новые первыми)
        docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Оставляем самую новую версию
        const keepDoc = docs[0];
        const deleteDoc = docs.slice(1);
        
        console.log(`   ✅ Оставляем самую новую: ${keepDoc.id} (${keepDoc.created_at})`);
        idsToKeep.push(keepDoc.id);
        
        deleteDoc.forEach(doc => {
          console.log(`   🗑️ Удаляем старую: ${doc.id} (${doc.created_at})`);
          idsToDelete.push(doc.id);
        });
      }
    });

    console.log(`\n📈 Итого:`);
    console.log(`   Оставляем: ${idsToKeep.length} документов`);
    console.log(`   Удаляем: ${idsToDelete.length} дубликатов`);

    if (idsToDelete.length > 0) {
      console.log(`\n🧹 Удаляем дубликаты...`);
      
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('❌ Ошибка удаления:', deleteError);
      } else {
        console.log(`✅ Успешно удалено ${idsToDelete.length} дубликатов`);
        
        // Показываем итоговый список документов
        console.log(`\n📋 Оставшиеся документы:`);
        const { data: finalDocs } = await supabase
          .from('documents')
          .select('id, title, cover_url')
          .order('title');

        finalDocs.forEach((doc, index) => {
          const hasCover = doc.cover_url && doc.cover_url.includes('supabase.co');
          console.log(`   ${index + 1}. ${doc.title}`);
          console.log(`      ID: ${doc.id}`);
          console.log(`      Cover: ${hasCover ? '✅' : '❌'}`);
        });
      }
    } else {
      console.log(`\n✨ Дубликатов не найдено!`);
    }

  } catch (error) {
    console.error('🚨 Ошибка:', error);
  }
}

cleanupDuplicates();
