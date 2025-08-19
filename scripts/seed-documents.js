const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mcexzjzowwanxawbiizd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const documents = [
  {
    title: 'EnergyLogic: Искусство Перекалибровки Реальности',
    description: 'Исследование глубинных механизмов трансформации восприятия и многоуровневой работы с слоями реальности',
    price: 199,
    price_rub: 199,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/pdfs/EnergyLogic-Iskusstvo-Perekalibrovki-Realnosti.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvcGRmcy9FbmVyZ3lMb2dpYy1Jc2t1c3N0dm8tUGVyZWthbGlicm92a2ktUmVhbG5vc3RpLnBkZiIsImlhdCI6MTc1NTM4Njc5NSwiZXhwIjoxNzg2OTIyNzk1fQ.IYABIrNFOWptQEzhfnJNymZ7qMeg6jGAXrmi8rHhtnk',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/EnergyLogic-Iskusstvo-Perekalibrovki-Realnosti.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL0VuZXJneUxvZ2ljLUlza3Vzc3R2by1QZXJla2FsaWJyb3ZraS1SZWFsbm9zdGkucG5nIiwiaWF0IjoxNzU1Mzg2ODIxLCJleHAiOjE3ODY5MjI4MjF9.iv7ijB-psxjsR-GtUmcjGiev_OpjtKNn60B3N8wk40U'
  },
  {
    title: 'Нейробиология эмоций: биологические основы и методы синхронизации',
    description: 'Научный семинар, посвященный нейробиологическим основам эмоциональных процессов.',
    price: 199,
    price_rub: 199,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/pdfs/Nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvcGRmcy9OZWpyb2Jpb2xvZ2l5YS1lbW9jaWotYmlvbG9naWNoZXNraWUtb3Nub3Z5LWktbWV0b2R5LXNpbmhyb25pemFjaWkucGRmIiwiaWF0IjoxNzU1Mzg3MDI0LCJleHAiOjE3ODY5MjMwMjR9.DazLzNCwrK771tzTUerVYlr_57HThoukA6DtIBmSgrs',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL05lanJvYmlvbG9naXlhLWVtb2Npai1iaW9sb2dpY2hlc2tpZS1vc25vdnktaS1tZXRvZHktc2luaHJvbml6YWNpaS5wbmciLCJpYXQiOjE3NTUzODcwNDksImV4cCI6MTc4NjkyMzA0OX0.DAuN3fvl1zWYUlP5SU2GenXKSfxipMYuTUztFIWI0n8'
  },
  {
    title: 'Карта Самопознания: Когда Я Ничего Не Понимаю',
    description: 'Путешествие к истинному пониманию себя — это непрерывный процесс трансформации, который начинается с признания того, что мы не те, кем себя считаем. Эта презентация поможет вам увидеть себя по-настоящему, распознать свои паттерны и научиться настраивать свою внутреннюю систему.',
    price: 199,
    price_rub: 199,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/pdfs/Karta-Samopoznaniya-Kogda-Ya-Nichego-Ne-Ponimayu.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvcGRmcy9LYXJ0YS1TYW1vcG96bmFuaXlhLUtvZ2RhLVlhLU5pY2hlZ28tTmUtUG9uaW1heXUucGRmIiwiaWF0IjoxNzU1Mzg3MTU5LCJleHAiOjE3ODY5MjMxNTl9.g44MW4hoRNfbDDVSbOWbeoi3AmDYOboBwQ91VuYJQ9k',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Karta-Samopoznaniya-Kogda-Ya-Nichego-Ne-Ponimayu.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL0thcnRhLVNhbW9wb3puYW5peWEtS29nZGEtWWEtTmljaGVnby1OZS1Qb25pbWF5dS5wbmciLCJpYXQiOjE3NTUzODcxNDUsImV4cCI6MTc4NjkyMzE0NX0.bf5DV54SGwizhl2FDcU9e_Q2zn6rkP_6DgJ505UiudA'
  },
  {
    title: 'Квантовая Архитектура Намерения: Метод Сознательной Перезаписи Реальности',
    description: 'Глубинные механизмы формирования реальности через настройку личного сознания и его синхронизацию с метаполем. Вы узнаете, как создавать устойчивые паттерны намерения, способные менять структуру событий вокруг вас.',
    price: 199,
    price_rub: 199,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/pdfs/Kvantovaya-Arhitektura-Namereniya-Metod-Soznatelnoj-Perezapisi-Realnosti.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvcGRmcy9LdmFudG92YXlhLUFyaGl0ZWt0dXJhLU5hbWVyZW5peWEtTWV0b2QtU296bmF0ZWxub2otUGVyZXphcGlzaS1SZWFsbm9zdGkucGRmIiwiaWF0IjoxNzU1Mzg3MzE1LCJleHAiOjE3ODY5MjMzMTV9.wdmtQFrOA0emUvS8PC6WdffCs529e73mAh-JrEc-zMk',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Kvantovaya-Arhitektura-Namereniya-Metod-Soznatelnoj-Perezapisi-Realnosti.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL0t2YW50b3ZheWEtQXJoaXRla3R1cmEtTmFtZXJlbml5YS1NZXRvZC1Tb3puYXRlbG5vai1QZXJlemFwaXNpLVJlYWxub3N0aS5wbmciLCJpYXQiOjE3NTUzODczMjgsImV4cCI6MTc4NjkyMzMyOH0.2Lmpey58jLTyR8DQR701B_0rwZWey8rJbzE1swWEmN8'
  },
  {
    title: 'Распознавание внешних сценариев: Инструменты самонаблюдения',
    description: 'Глубинное исследование механизмов, через которые внешние системы встраиваются в наше сознание без личной воли, и методы распознавания этих вставок. Приглашаю вас в путешествие по слоистой структуре собственной жизни, где мы научимся различать то, что по-настоящему наше, от того, что было подложено извне.',
    price: 299,
    price_rub: 299,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/pdfs/Raspoznavanie-vneshnih-scenariev-Instrumenty-samonablyudeniya.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvcGRmcy9SYXNwb3puYXZhbmllLXZuZXNobmloLXNjZW5hcmlldi1JbnN0cnVtZW50eS1zYW1vbmFibHl1ZGVuaXlhLnBkZiIsImlhdCI6MTc1NTM4NzQxNCwiZXhwIjoxNzg2OTIzNDE0fQ.1J0Ijo0YHsPiTjeuSrse2HaOyFovOaB3mjIcb6b9p9I',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Raspoznavanie-vneshnih-scenariev-Instrumenty-samonablyudeniya.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL1Jhc3Bvem5hdmFuaWUtdm5lc2huaWgtc2NlbmFyaWV2LUluc3RydW1lbnR5LXNhbW9uYWJseXVkZW5peWEucG5nIiwiaWF0IjoxNzU1Mzg3NDI2LCJleHAiOjE3ODY5MjM0MjZ9.0-5ngwlY2oZrCWN1DRL2IiFU3-hbbktLCZigKe5rnEQ'
  },
  {
    title: 'Настраиваемая реальность: метафизическая модель сознания',
    description: 'Если принять за аксиому, что реальность настраиваема и её свойства можно менять так же, как параметры в сложной системе, то открывается совершенно иное понимание мироздания и нашего места в нём. В этой презентации мы рассмотрим структуру такой реальности, её фундаментальные свойства и возможные модели взаимодействия с ней.',
    price: 299,
    price_rub: 299,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/pdfs/Nastraivaemaya-realnost-metafizicheskaya-model-soznaniya.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvcGRmcy9OYXN0cmFpdmFlbWF5YS1yZWFsbm9zdC1tZXRhZml6aWNoZXNrYXlhLW1vZGVsLXNvem5hbml5YS5wZGYiLCJpYXQiOjE3NTUzODc1MDUsImV4cCI6MTc4NjkyMzUwNX0.dF-ub21CPWs8kubWvRKsoECKVk88_ThylVN9nYOwEB8',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/sign/Documents/covers/Nastraivaemaya-realnost-metafizicheskaya-model-soznaniya.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zMDU3MjdjOC02NGExLTQ1NzYtODMzMS0zZGE3NTBjZmQyYTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb2N1bWVudHMvY292ZXJzL05hc3RyYWl2YWVtYXlhLXJlYWxub3N0LW1ldGFmaXppY2hlc2theWEtbW9kZWwtc296bmFuaXlhLnBuZyIsImlhdCI6MTc1NTM4NzUxOCwiZXhwIjoxNzg2OTIzNTE4fQ.-rJJGV8UpsgmGFXOctLuE0qWA1FLlkBbbevh6LjnkDc'
  }
]

async function seedDocuments() {
  try {
    console.log('🌱 Начинаем заполнение базы данных документами...')
    
    // Сначала очищаем существующие записи
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id')
    
    if (existingDocs && existingDocs.length > 0) {
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .in('id', existingDocs.map(doc => doc.id))
      
      if (deleteError) {
        console.error('❌ Ошибка при очистке таблицы:', deleteError)
      } else {
        console.log('🧹 Таблица documents очищена')
      }
    } else {
      console.log('🧹 Таблица documents уже пуста')
    }
    
    // Добавляем новые документы
    const { data, error } = await supabase
      .from('documents')
      .insert(documents)
      .select()
    
    if (error) {
      console.error('❌ Ошибка при добавлении документов:', error)
      return
    }
    
    console.log('✅ Успешно добавлено документов:', data.length)
    console.log('📄 Документы:', data.map(doc => `- ${doc.title} (${doc.price_rub} ₽)`).join('\n'))
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error)
  }
}

// Запускаем скрипт
seedDocuments()