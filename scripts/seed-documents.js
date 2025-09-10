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
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/energylogic-iskusstvo-perekalibrovki-realnosti/main.pdf',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/energylogic-iskusstvo-perekalibrovki-realnosti/cover.png'
  },
  {
    title: 'Нейробиология эмоций: биологические основы и методы синхронизации',
    description: 'Научный семинар, посвященный нейробиологическим основам эмоциональных процессов.',
    price: 199,
    price_rub: 199,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii/main.pdf',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii/cover.png'
  },
  {
    title: 'Карта Самопознания: Когда Я Ничего Не Понимаю',
    description: 'Путешествие к истинному пониманию себя — это непрерывный процесс трансформации, который начинается с признания того, что мы не те, кем себя считаем. Эта презентация поможет вам увидеть себя по-настоящему, распознать свои паттерны и научиться настраивать свою внутреннюю систему.',
    price: 199,
    price_rub: 199,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/karta-samopoznaniya-kogda-ya-nichego-ne-ponimayu/main.pdf',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/karta-samopoznaniya-kogda-ya-nichego-ne-ponimayu/cover.png'
  },
  {
    title: 'Квантовая Архитектура Намерения: Метод Сознательной Перезаписи Реальности',
    description: 'Глубинные механизмы формирования реальности через настройку личного сознания и его синхронизацию с метаполем. Вы узнаете, как создавать устойчивые паттерны намерения, способные менять структуру событий вокруг вас.',
    price: 199,
    price_rub: 199,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/kvantovaya-arhitektura-namereniya-metod-soznatelnoj-perezapisi-realnosti/main.pdf',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/kvantovaya-arhitektura-namereniya-metod-soznatelnoj-perezapisi-realnosti/cover.png'
  },
  {
    title: 'Распознавание внешних сценариев: Инструменты самонаблюдения',
    description: 'Глубинное исследование механизмов, через которые внешние системы встраиваются в наше сознание без личной воли, и методы распознавания этих вставок. Приглашаю вас в путешествие по слоистой структуре собственной жизни, где мы научимся различать то, что по-настоящему наше, от того, что было подложено извне.',
    price: 299,
    price_rub: 299,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/raspoznavanie-vneshnih-scenariev-instrumenty-samonablyudeniya/main.pdf',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/raspoznavanie-vneshnih-scenariev-instrumenty-samonablyudeniya/cover.png'
  },
  {
    title: 'Настраиваемая реальность: метафизическая модель сознания',
    description: 'Если принять за аксиому, что реальность настраиваема и её свойства можно менять так же, как параметры в сложной системе, то открывается совершенно иное понимание мироздания и нашего места в нём. В этой презентации мы рассмотрим структуру такой реальности, её фундаментальные свойства и возможные модели взаимодействия с ней.',
    price: 299,
    price_rub: 299,
    file_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nastraivaemaya-realnost-metafizicheskaya-model-soznaniya/main.pdf',
    cover_url: 'https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nastraivaemaya-realnost-metafizicheskaya-model-soznaniya/cover.png'
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