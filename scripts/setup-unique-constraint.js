const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mcexzjzowwanxawbiizd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'
);

async function setupUniqueConstraint() {
  console.log('🔧 Настройка уникального ограничения для документов...');
  
  try {
    // 1. Получаем все документы, сгруппированные по названию
    console.log('📊 Анализируем дубликаты...');
    const { data: allDocs, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Ошибка получения документов:', fetchError);
      return;
    }

    console.log(`📋 Всего документов: ${allDocs.length}`);

    // 2. Группируем по названию и находим дубликаты
    const groupedByTitle = {};
    const duplicateIds = [];

    allDocs.forEach(doc => {
      if (!groupedByTitle[doc.title]) {
        groupedByTitle[doc.title] = [];
      }
      groupedByTitle[doc.title].push(doc);
    });

    // 3. Определяем какие документы удалить (оставляем самые новые)
    Object.entries(groupedByTitle).forEach(([title, docs]) => {
      if (docs.length > 1) {
        console.log(`\n📄 "${title}" - найдено ${docs.length} копий`);
        
        // Сортируем по дате создания (новые первыми)
        docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Оставляем первый (самый новый), остальные помечаем для удаления
        const keepDoc = docs[0];
        const toDelete = docs.slice(1);
        
        console.log(`   ✅ Оставляем: ${keepDoc.id} (${keepDoc.created_at})`);
        
        toDelete.forEach(doc => {
          console.log(`   🗑️ Удаляем: ${doc.id} (${doc.created_at})`);
          duplicateIds.push(doc.id);
        });
      }
    });

    console.log(`\n📈 Итого:`);
    console.log(`   Уникальных документов: ${Object.keys(groupedByTitle).length}`);
    console.log(`   Дубликатов для удаления: ${duplicateIds.length}`);

    // 4. Удаляем дубликаты небольшими пакетами
    if (duplicateIds.length > 0) {
      console.log(`\n🧹 Удаляем дубликаты...`);
      
      const batchSize = 5;
      for (let i = 0; i < duplicateIds.length; i += batchSize) {
        const batch = duplicateIds.slice(i, i + batchSize);
        
        console.log(`   Удаляем пакет ${Math.floor(i/batchSize) + 1}: ${batch.length} документов...`);
        
        const { error: deleteError } = await supabase
          .from('documents')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error(`❌ Ошибка удаления пакета:`, deleteError);
        } else {
          console.log(`   ✅ Пакет ${Math.floor(i/batchSize) + 1} удален`);
        }
        
        // Пауза между пакетами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 5. Проверяем финальное состояние
    console.log(`\n🔍 Проверяем финальное состояние...`);
    const { data: finalDocs } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .order('title');

    const finalGroups = {};
    finalDocs.forEach(doc => {
      if (!finalGroups[doc.title]) {
        finalGroups[doc.title] = 0;
      }
      finalGroups[doc.title]++;
    });

    console.log(`\n📋 Финальный список:`);
    Object.entries(finalGroups).forEach(([title, count]) => {
      const status = count === 1 ? '✅' : '❌';
      console.log(`   ${status} ${title} (${count} экз.)`);
    });

    if (Object.values(finalGroups).every(count => count === 1)) {
      console.log(`\n🎉 Отлично! Все дубликаты удалены. Теперь каждый документ уникален.`);
    } else {
      console.log(`\n⚠️ Внимание! Остались дубликаты. Возможно, нужно повторить процедуру.`);
    }

  } catch (error) {
    console.error('🚨 Критическая ошибка:', error);
  }
}

setupUniqueConstraint();
