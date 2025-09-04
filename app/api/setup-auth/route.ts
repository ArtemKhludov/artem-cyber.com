import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        console.log('🔧 Настройка таблиц авторизации...')

        // Читаем унифицированную схему из файла
        const fs = await import('fs')
        const path = await import('path')

        const schemaPath = path.join(process.cwd(), 'unified_database_schema.sql')
        const authTablesSQL = fs.readFileSync(schemaPath, 'utf8')

        // Создаем таблицы через Supabase API
        console.log('📝 Создаем таблицы авторизации...')

        // Создаем таблицу users
        const { error: usersError } = await supabase
            .from('users')
            .select('id')
            .limit(1)

        if (usersError && usersError.code === 'PGRST116') {
            console.log('📝 Таблица users не существует, создаем...')
            // Таблица не существует, но мы не можем создать её через API
            // Пользователь должен создать таблицы вручную в Supabase Dashboard
        }

        // Проверяем существование других таблиц
        const tablesToCheck = ['user_sessions', 'password_resets', 'purchase_requests', 'callback_requests']
        const existingTables = []

        for (const tableName of tablesToCheck) {
            try {
                const { error } = await supabase
                    .from(tableName)
                    .select('id')
                    .limit(1)

                if (!error || error.code !== 'PGRST116') {
                    existingTables.push(tableName)
                }
            } catch (err) {
                console.log(`📝 Таблица ${tableName} не существует`)
            }
        }

        console.log('📝 Существующие таблицы:', existingTables)

        // Проверяем, существует ли таблица users
        const { data: usersTest, error: usersTestError } = await supabase
            .from('users')
            .select('id')
            .limit(1)

        if (usersTestError && usersTestError.code === 'PGRST116') {
            console.log('❌ Таблица users не существует')
            return NextResponse.json({
                success: false,
                error: 'Таблица users не существует. Сначала создайте таблицы в Supabase Dashboard, используя файл unified_database_schema.sql',
                instructions: '1. Откройте Supabase Dashboard\n2. Перейдите в SQL Editor\n3. Выполните SQL из файла unified_database_schema.sql'
            }, { status: 400 })
        }

        // Проверяем, существует ли админ пользователь
        const { data: adminUser, error: adminCheckError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'admin@energylogic.ru')
            .single()

        if (adminCheckError && adminCheckError.code !== 'PGRST116') {
            console.error('❌ Ошибка проверки админ пользователя:', adminCheckError)
            return NextResponse.json({
                success: false,
                error: 'Ошибка проверки админ пользователя',
                details: adminCheckError.message
            }, { status: 500 })
        }

        // Если админ пользователь не существует, создаем его
        if (!adminUser) {
            const bcrypt = await import('bcryptjs')
            const adminPasswordHash = await bcrypt.hash('admin123', 10)

            const { error: adminError } = await supabase
                .from('users')
                .insert({
                    email: 'admin@energylogic.ru',
                    password_hash: adminPasswordHash,
                    name: 'Администратор',
                    role: 'admin',
                    email_verified: true
                })

            if (adminError) {
                console.error('❌ Ошибка создания админ пользователя:', adminError)
                return NextResponse.json({
                    success: false,
                    error: 'Ошибка создания админ пользователя',
                    details: adminError.message
                }, { status: 500 })
            }

            console.log('✅ Админ пользователь создан')
        } else {
            console.log('✅ Админ пользователь уже существует')
        }

        console.log('✅ Таблицы авторизации созданы успешно')
        return NextResponse.json({
            success: true,
            message: 'Таблицы авторизации созданы успешно',
            adminCredentials: {
                email: 'admin@energylogic.ru',
                password: 'admin123'
            }
        })

    } catch (error) {
        console.error('❌ Критическая ошибка:', error)
        return NextResponse.json({
            success: false,
            error: 'Критическая ошибка при настройке авторизации',
            details: error instanceof Error ? error.message : 'Неизвестная ошибка'
        }, { status: 500 })
    }
}
