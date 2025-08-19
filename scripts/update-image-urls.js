const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mcexzjzowwanxawbiizd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'
);

// Обновленные данные с корректными ссылками
const documentsData = [
  {
    id: '84f1cc74-936a-4bb7-8dba-33fea9d515be',
    title: 'EnergyLogic: Искусство Перекалибровки Реальности',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/EnergyLogic-Iskusstvo-Perekalibrovki-Realnosti.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL0VuZXJneUxvZ2ljLUlza3Vzc3R2by1QZXJla2FsaWJyb3ZraS1SZWFsbm9zdGkucG5nIiwiaWF0IjoxNzU1Mzg2ODIxLCJleHAiOjE3ODY5MjI4MjF9.iv7ijB-psxjsR-GtUmcjGiev_OpjtKNn60B3N8wk40U'
  },
  {
    id: '811a76b4-18d9-458a-a6f9-9072687f8ea2',
    title: 'Нейробиология эмоций: биологические основы и методы синхронизации',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL05lanJvYmlvbG9naXlhLWVtb2Npai1iaW9sb2dpY2hlc2tpZS1vc25vdnktaS1tZXRvZHktc2luaHJvbml6YWNpaS5wbmciLCJpYXQiOjE3NTUzODcwNDksImV4cCI6MTc4NjkyMzA0OX0.DAuN3fvl1zWYUlP5SU2GenXKSfxipMYuTUztFIWI0n8'
  },
  {
    id: '5080ac5b-e820-494f-88b3-0490b520db7f',
    title: 'Карта Самопознания: Когда Я Ничего Не Понимаю',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Karta-Samopoznaniya-Kogda-Ya-Nichego-Ne-Ponimayu.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL0thcnRhLVNhbW9wb3puYW5peWEtS29nZGEtWWEtTmljaGVnby1OZS1Qb25pbWF5dS5wbmciLCJpYXQiOjE3NTUzODcxNDUsImV4cCI6MTc4NjkyMzE0NX0.bf5DV54SGwizhl2FDcU9e_Q2zn6rkP_6DgJ505UiudA'
  },
  {
    id: '7b3e63f4-45fb-44a3-93cd-ff4abeead3e4',
    title: 'Квантовая Архитектура Намерения: Метод Сознательной Перезаписи Реальности',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Kvantovaya-Arhitektura-Namereniya-Metod-Soznatelnoj-Perezapisi-Realnosti.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL0t2YW50b3ZheWEtQXJoaXRla3R1cmEtTmFtZXJlbml5YS1NZXRvZC1Tb3puYXRlbG5vai1QZXJlemFwaXNpLVJlYWxub3N0aS5wbmciLCJpYXQiOjE3NTUzODczMjgsImV4cCI6MTc4NjkyMzMyOH0.2Lmpey58jLTyR8DQR701B_0rwZWey8rJbzE1swWEmN8'
  },
  {
    id: '5e677c76-1818-4adc-850a-4352c9e36196',
    title: 'Распознавание внешних сценариев: Инструменты самонаблюдения',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Raspoznavanie-vneshnih-scenariev-Instrumenty-samonablyudeniya.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL1Jhc3Bvem5hdmFuaWUtdm5lc2huaWgtc2NlbmFyaWV2LUluc3RydW1lbnR5LXNhbW9uYWJseXVkZW5peWEucG5nIiwiaWF0IjoxNzU1Mzg3NDI2LCJleHAiOjE3ODY5MjM0MjZ9.0-5ngwlY2oZrCWN1DRL2IiFU3-hbbktLCZigKe5rnEQ'
  },
  {
    id: '96736874-7846-4af7-a2ef-a9cd3ff2b676',
    title: 'Настраиваемая реальность: метафизическая модель сознания',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Nastraivaemaya-realnost-metafizicheskaya-model-soznaniya.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL05hc3RyYWl2YWVtYXlhLXJlYWxub3N0LW1ldGFmaXppY2hlc2theWEtbW9kZWwtc296bmFuaXlhLnBuZyIsImlhdCI6MTc1NTM4NzUxOCwiZXhwIjoxNzg2OTIzNTE4fQ.-rJJGV8UpsgmGFXOctLuE0qWA1FLlkBbbevh6LjnkDc'
  }
];

async function updateImageUrls() {
  console.log('🖼️ Обновляем URL изображений...');
  
  try {
    for (const doc of documentsData) {
      console.log(`📄 Обновляем: ${doc.title}...`);
      
      const { error } = await supabase
        .from('documents')
        .update({ 
          cover_url: doc.cover_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      if (error) {
        console.error(`❌ Ошибка обновления ${doc.title}:`, error);
      } else {
        console.log(`✅ Обновлен: ${doc.title}`);
      }
    }

    console.log('\n🔍 Проверяем результат...');
    const { data: updatedDocs } = await supabase
      .from('documents')
      .select('title, cover_url')
      .order('title');

    updatedDocs.forEach(doc => {
      const hasValidUrl = doc.cover_url && doc.cover_url.includes('supabase.co');
      console.log(`${hasValidUrl ? '✅' : '❌'} ${doc.title}`);
    });

  } catch (error) {
    console.error('🚨 Ошибка:', error);
  }
}

updateImageUrls();
