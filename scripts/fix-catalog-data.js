const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mcexzjzowwanxawbiizd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZXh6anpvd3dhbnhhd2JpaXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzg4MjQsImV4cCI6MjA3MDk1NDgyNH0.-sAXcSK2crzmBULuPxRSfI9fNde9aQZxNvag2qkmZUs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Правильные данные для документов
const correctDocuments = [
  {
    title: "EnergyLogic: Искусство Перекалибровки Реальности",
    description: "Исследование глубинных механизмов трансформации восприятия и многоуровневой работы с слоями реальности. Практическое руководство по изменению фундаментальных убеждений.",
    price: 299, // Добавлено поле price
    price_rub: 299,
    file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/EnergyLogic-Iskusstvo-Perekalibrovki-Realnosti.pdf",
    cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/EnergyLogic-Iskusstvo-Perekalibrovki-Realnosti.png"
  },
  {
    title: "Карта Самопознания: Когда Я Ничего Не Понимаю",
    description: "Путешествие к истинному пониманию себя — это непрерывный процесс трансформации. Руководство по навигации в моменты неопределенности и растерянности.",
    price: 399,
    price_rub: 399,
    file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Karta-Samopoznaniya-Kogda-Ya-Nichego-Ne-Ponimayu.pdf",
    cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Karta-Samopoznaniya-Kogda-Ya-Nichego-Ne-Ponimayu.png"
  },
  {
    title: "Квантовая Архитектура Намерения: Метод Сознательной Перезаписи Реальности",
    description: "Продвинутые техники работы с намерением и структурой реальности. Как сознательно создавать желаемые сценарии жизни через квантовые принципы.",
    price: 599,
    price_rub: 599,
    file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Kvantovaya-Arhitektura-Namereniya-Metod-Soznatelnoj-Perezapisi-Realnosti.pdf",
    cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Kvantovaya-Arhitektura-Namereniya-Metod-Soznatelnoj-Perezapisi-Realnosti.png"
  },
  {
    title: "Настраиваемая реальность: метафизическая модель сознания",
    description: "Глубокое понимание природы сознания и его роли в формировании реальности. Практическая метафизика для ежедневного применения.",
    price: 499,
    price_rub: 499,
    file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Nastraivaemaya-realnost-metafizicheskaya-model-soznaniya.pdf",
    cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Nastraivaemaya-realnost-metafizicheskaya-model-soznaniya.png"
  },
  {
    title: "Нейробиология эмоций: биологические основы и методы синхронизации",
    description: "Научный подход к пониманию эмоциональных процессов. Как работать с эмоциями на биологическом уровне для достижения внутренней гармонии.",
    price: 699,
    price_rub: 699,
    file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii.pdf",
    cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii.png"
  },
  {
    title: "Распознавание внешних сценариев: Инструменты самонаблюдения",
    description: "Методы распознавания и трансформации автоматических паттернов поведения. Практические техники осознанного наблюдения за собой.",
    price: 349,
    price_rub: 349,
    file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Raspoznavanie-vneshnih-scenariev-Instrumenty-samonablyudeniya.pdf",
    cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Raspoznavanie-vneshnih-scenariev-Instrumenty-samonablyudeniya.png"
  }
]

async function updateExistingDocuments() {
  console.log('🔄 Обновляем существующие документы...')
  
  try {
    // Получаем все существующие документы
    const { data: existingDocs, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Ошибка при получении документов:', fetchError)
      return
    }
    
    console.log(`📄 Найдено ${existingDocs?.length || 0} существующих документов`)
    
    // Обновляем каждый документ правильными данными
    for (let i = 0; i < Math.min(existingDocs.length, correctDocuments.length); i++) {
      const existingDoc = existingDocs[i]
      const correctDoc = correctDocuments[i]
      
      console.log(`🔄 Обновляем документ: ${correctDoc.title}`)
      
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          title: correctDoc.title,
          description: correctDoc.description,
          price: correctDoc.price,
          price_rub: correctDoc.price_rub,
          file_url: correctDoc.file_url,
          cover_url: correctDoc.cover_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDoc.id)
      
      if (updateError) {
        console.error(`❌ Ошибка при обновлении документа "${correctDoc.title}":`, updateError)
      } else {
        console.log(`✅ Обновлен: ${correctDoc.title}`)
      }
    }
    
    // Если нужно добавить еще документы
    if (correctDocuments.length > existingDocs.length) {
      console.log('📄 Добавляем недостающие документы...')
      
      for (let i = existingDocs.length; i < correctDocuments.length; i++) {
        const doc = correctDocuments[i]
        console.log(`📄 Добавляем: ${doc.title}`)
        
        const { error: insertError } = await supabase
          .from('documents')
          .insert([{
            ...doc,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
        
        if (insertError) {
          console.error(`❌ Ошибка при добавлении "${doc.title}":`, insertError)
        } else {
          console.log(`✅ Добавлен: ${doc.title}`)
        }
      }
    }
    
    // Проверяем результат
    console.log('🔍 Проверяем результат...')
    const { data: finalData, error: checkError } = await supabase
      .from('documents')
      .select('id, title, price_rub, description')
      .order('created_at', { ascending: false })
    
    if (checkError) {
      console.error('❌ Ошибка при проверке:', checkError)
      return
    }
    
    console.log('✅ База данных успешно обновлена!')
    console.log(`📊 Всего документов: ${finalData?.length || 0}`)
    
    if (finalData) {
      finalData.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.title} - ${doc.price_rub}₽`)
      })
    }
    
  } catch (error) {
    console.error('❌ Произошла ошибка:', error)
  }
}

// Запускаем скрипт
updateExistingDocuments()
