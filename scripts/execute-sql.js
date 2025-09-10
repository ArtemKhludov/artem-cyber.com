const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function executeSQL() {
    console.log('🔧 Выполнение SQL скрипта для исправления таблицы purchases...\n')

    try {
        // Читаем SQL файл
        const sqlContent = fs.readFileSync('fix-purchases-table.sql', 'utf8')
        console.log('✅ SQL файл прочитан')

        // Разбиваем на отдельные команды
        const sqlCommands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

        console.log(`📝 Найдено ${sqlCommands.length} SQL команд`)

        // Выполняем каждую команду
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i]
            if (command.trim()) {
                console.log(`\n${i + 1}. Выполнение команды...`)
                console.log(`   ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`)

                try {
                    const { data, error } = await supabase.rpc('exec_sql', { sql: command })

                    if (error) {
                        console.error(`❌ Ошибка выполнения команды ${i + 1}:`, error)
                        // Продолжаем выполнение других команд
                    } else {
                        console.log(`✅ Команда ${i + 1} выполнена успешно`)
                    }
                } catch (err) {
                    console.error(`❌ Исключение при выполнении команды ${i + 1}:`, err.message)
                }
            }
        }

        console.log('\n🎉 Выполнение SQL скрипта завершено!')

    } catch (error) {
        console.error('❌ Критическая ошибка:', error)
    }
}

// Запускаем выполнение
executeSQL()
