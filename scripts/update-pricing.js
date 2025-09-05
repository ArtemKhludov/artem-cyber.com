const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mcexzjzowwanxawbiizd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY не найден в переменных окружения')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Конкретные цены для PDF-документов
const documentsWithPricing = [
    {
        title: "EnergyLogic: Искусство Перекалибровки Реальности",
        description: "Исследование глубинных механизмов трансформации восприятия и многоуровневой работы с слоями реальности. Практическое руководство по изменению фундаментальных убеждений.",
        price: 2990,
        price_rub: 2990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/EnergyLogic-Iskusstvo-Perekalibrovki-Realnosti.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/EnergyLogic-Iskusstvo-Perekalibrovki-Realnosti.png",
        page_count: 45
    },
    {
        title: "Карта Самопознания: Когда Я Ничего Не Понимаю",
        description: "Практическое руководство по навигации в периоды неопределенности и поиску внутренних ориентиров.",
        price: 1990,
        price_rub: 1990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Karta-Samopoznaniya.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Karta-Samopoznaniya.png",
        page_count: 32
    },
    {
        title: "Энергетическая Диагностика: Полное Руководство",
        description: "Комплексная система анализа энергетических паттернов и их влияния на жизненные сценарии.",
        price: 3490,
        price_rub: 3490,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Energeticheskaya-Diagnostika.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Energeticheskaya-Diagnostika.png",
        page_count: 58
    },
    {
        title: "Протокол Трансформации: 21-Дневный Курс",
        description: "Пошаговое руководство по глубокой трансформации личности с ежедневными практиками и упражнениями.",
        price: 4990,
        price_rub: 4990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Protokol-Transformatsii.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Protokol-Transformatsii.png",
        page_count: 78
    },
    {
        title: "Слои Реальности: Работа с Многомерностью",
        description: "Исследование различных уровней реальности и методов работы с ними для достижения желаемых изменений.",
        price: 2490,
        price_rub: 2490,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/pdfs/Sloi-Realnosti.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/Documents/covers/Sloi-Realnosti.png",
        page_count: 41
    }
]

async function updateDocumentsPricing() {
    try {
        console.log('🔄 Обновление цен документов...')

        // Сначала очищаем таблицу документов
        const { error: deleteError } = await supabase
            .from('documents')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Удаляем все записи

        if (deleteError) {
            console.error('Ошибка при очистке таблицы документов:', deleteError)
            return
        }

        console.log('✅ Таблица документов очищена')

        // Вставляем документы с новыми ценами
        const { data, error } = await supabase
            .from('documents')
            .insert(documentsWithPricing)
            .select()

        if (error) {
            console.error('Ошибка при вставке документов:', error)
            return
        }

        console.log('✅ Документы с конкретными ценами добавлены:')
        data.forEach((doc, index) => {
            console.log(`${index + 1}. ${doc.title} - ${doc.price_rub} ₽`)
        })

        console.log(`\n🎉 Успешно обновлено ${data.length} документов с конкретными ценами!`)

    } catch (error) {
        console.error('Ошибка при обновлении цен:', error)
    }
}

// Запускаем обновление
updateDocumentsPricing()
