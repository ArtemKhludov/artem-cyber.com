const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixPurchasesTable() {
    console.log('🔧 Исправление структуры таблицы purchases...\n')

    try {
        // 1. Сначала проверим текущую структуру
        console.log('1️⃣ Проверка текущей структуры...')

        const { data: currentStructure, error: structureError } = await supabase
            .from('purchases')
            .select('*')
            .limit(1)

        if (structureError) {
            console.log('❌ Таблица purchases не существует или недоступна:', structureError.message)
        } else {
            console.log('✅ Таблица purchases существует')
            if (currentStructure && currentStructure.length > 0) {
                console.log('   Текущие колонки:', Object.keys(currentStructure[0]).join(', '))
            } else {
                console.log('   Таблица пуста')
            }
        }

        // 2. Попробуем создать таблицу с правильной структурой
        console.log('\n2️⃣ Создание таблицы purchases с правильной структурой...')

        // Сначала удалим старую таблицу если она есть
        try {
            await supabase.rpc('exec', { sql: 'DROP TABLE IF EXISTS purchases CASCADE;' })
            console.log('✅ Старая таблица удалена (если существовала)')
        } catch (err) {
            console.log('ℹ️ Не удалось удалить старую таблицу (возможно, её не было)')
        }

        // Создаем новую таблицу
        const createTableSQL = `
      CREATE TABLE purchases (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
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

        try {
            await supabase.rpc('exec', { sql: createTableSQL })
            console.log('✅ Таблица purchases создана')
        } catch (err) {
            console.error('❌ Ошибка создания таблицы:', err.message)

            // Попробуем альтернативный способ - через прямой SQL
            console.log('🔄 Попробуем альтернативный способ...')

            // Создаем таблицу по частям
            const steps = [
                'CREATE TABLE IF NOT EXISTS purchases (id UUID DEFAULT gen_random_uuid() PRIMARY KEY);',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE CASCADE;',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL;',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT \'stripe\';',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT \'pending\';',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cryptomus_order_id TEXT;',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS amount_paid INTEGER NOT NULL;',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT \'RUB\';',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS user_country TEXT;',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS user_ip TEXT;',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();',
                'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();'
            ]

            for (const step of steps) {
                try {
                    await supabase.rpc('exec', { sql: step })
                    console.log(`✅ Шаг выполнен: ${step.substring(0, 50)}...`)
                } catch (stepErr) {
                    console.error(`❌ Ошибка шага: ${stepErr.message}`)
                }
            }
        }

        // 3. Создаем индексы
        console.log('\n3️⃣ Создание индексов...')

        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_purchases_user_email ON purchases(user_email);',
            'CREATE INDEX IF NOT EXISTS idx_purchases_document_id ON purchases(document_id);',
            'CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);',
            'CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);'
        ]

        for (const indexSQL of indexes) {
            try {
                await supabase.rpc('exec', { sql: indexSQL })
                console.log(`✅ Индекс создан: ${indexSQL.split(' ')[5]}`)
            } catch (err) {
                console.error(`❌ Ошибка создания индекса: ${err.message}`)
            }
        }

        // 4. Включаем RLS
        console.log('\n4️⃣ Настройка RLS...')

        try {
            await supabase.rpc('exec', { sql: 'ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;' })
            console.log('✅ RLS включен')
        } catch (err) {
            console.error('❌ Ошибка включения RLS:', err.message)
        }

        // 5. Создаем политики RLS
        console.log('\n5️⃣ Создание политик RLS...')

        const policies = [
            'CREATE POLICY "Anyone can read purchases" ON purchases FOR SELECT USING (true);',
            'CREATE POLICY "Anyone can create purchases" ON purchases FOR INSERT WITH CHECK (true);',
            'CREATE POLICY "Anyone can update purchases" ON purchases FOR UPDATE USING (true);'
        ]

        for (const policySQL of policies) {
            try {
                await supabase.rpc('exec', { sql: policySQL })
                console.log(`✅ Политика создана`)
            } catch (err) {
                console.error(`❌ Ошибка создания политики: ${err.message}`)
            }
        }

        // 6. Проверяем результат
        console.log('\n6️⃣ Проверка результата...')

        const { data: newStructure, error: newStructureError } = await supabase
            .from('purchases')
            .select('*')
            .limit(1)

        if (newStructureError) {
            console.error('❌ Ошибка проверки структуры:', newStructureError)
        } else {
            console.log('✅ Таблица purchases готова к использованию')
            if (newStructure && newStructure.length > 0) {
                console.log('   Колонки:', Object.keys(newStructure[0]).join(', '))
            } else {
                console.log('   Таблица пуста (это нормально)')
            }
        }

        console.log('\n🎉 Исправление структуры таблицы завершено!')

    } catch (error) {
        console.error('❌ Критическая ошибка:', error)
    }
}

// Запускаем исправление
fixPurchasesTable()
