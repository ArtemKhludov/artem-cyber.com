const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createPurchasesTable() {
    console.log('🔧 Создание таблицы purchases простым способом...\n')

    try {
        // Попробуем создать таблицу через INSERT с минимальными данными
        console.log('1️⃣ Попытка создания таблицы через тестовую вставку...')

        const testData = {
            document_id: '00000000-0000-0000-0000-000000000000', // Временный UUID
            user_email: 'test@example.com',
            payment_method: 'stripe',
            payment_status: 'pending',
            amount_paid: 1000,
            currency: 'RUB'
        }

        try {
            const { data, error } = await supabase
                .from('purchases')
                .insert(testData)
                .select()

            if (error) {
                console.error('❌ Ошибка вставки тестовых данных:', error)

                // Если таблица не существует, попробуем создать её через SQL
                console.log('\n2️⃣ Попытка создания таблицы через SQL...')

                const createTableSQL = `
          CREATE TABLE IF NOT EXISTS purchases (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            document_id UUID,
            user_email TEXT NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'stripe',
            payment_status TEXT NOT NULL DEFAULT 'pending',
            stripe_payment_intent_id TEXT,
            cryptomus_order_id TEXT,
            amount_paid INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'RUB',
            user_country TEXT,
            user_ip TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `

                // Попробуем выполнить SQL через rpc
                try {
                    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec', {
                        sql: createTableSQL
                    })

                    if (sqlError) {
                        console.error('❌ Ошибка выполнения SQL:', sqlError)
                    } else {
                        console.log('✅ SQL выполнен успешно')
                    }
                } catch (sqlErr) {
                    console.error('❌ Исключение при выполнении SQL:', sqlErr.message)
                }

                // Попробуем снова вставить тестовые данные
                console.log('\n3️⃣ Повторная попытка вставки тестовых данных...')

                const { data: retryData, error: retryError } = await supabase
                    .from('purchases')
                    .insert(testData)
                    .select()

                if (retryError) {
                    console.error('❌ Повторная ошибка вставки:', retryError)
                } else {
                    console.log('✅ Тестовые данные вставлены успешно')
                    console.log('   Данные:', retryData)
                }

            } else {
                console.log('✅ Тестовые данные вставлены успешно')
                console.log('   Данные:', data)
            }

        } catch (insertErr) {
            console.error('❌ Исключение при вставке:', insertErr.message)
        }

        // Проверим структуру таблицы
        console.log('\n4️⃣ Проверка структуры таблицы...')

        const { data: structure, error: structureError } = await supabase
            .from('purchases')
            .select('*')
            .limit(1)

        if (structureError) {
            console.error('❌ Ошибка проверки структуры:', structureError)
        } else {
            console.log('✅ Структура таблицы:')
            if (structure && structure.length > 0) {
                console.log('   Колонки:', Object.keys(structure[0]).join(', '))
                console.log('   Пример данных:', structure[0])
            } else {
                console.log('   Таблица пуста')
            }
        }

        console.log('\n🎉 Создание таблицы завершено!')

    } catch (error) {
        console.error('❌ Критическая ошибка:', error)
    }
}

// Запускаем создание
createPurchasesTable()
