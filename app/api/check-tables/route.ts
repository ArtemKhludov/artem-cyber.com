import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Проверяем существующие таблицы...')

        // Список таблиц для проверки
        const tablesToCheck = [
            'users',
            'profiles',
            'user_sessions',
            'password_resets',
            'orders',
            'sessions',
            'documents',
            'purchases',
            'callback_requests',
            'purchase_requests',
            'pdf_requests',
            'general_requests',
            'managers',
            'analytics_events'
        ]

        const existingTables = []
        const nonExistingTables = []

        for (const tableName of tablesToCheck) {
            try {
                const { error } = await supabase
                    .from(tableName)
                    .select('id')
                    .limit(1)

                if (error && error.code === 'PGRST116') {
                    nonExistingTables.push(tableName)
                } else if (error) {
                    console.warn(`⚠️ Ошибка при проверке таблицы ${tableName}:`, error.message)
                    nonExistingTables.push(tableName)
                } else {
                    existingTables.push(tableName)
                }
            } catch (err) {
                console.warn(`⚠️ Исключение при проверке таблицы ${tableName}:`, err)
                nonExistingTables.push(tableName)
            }
        }

        // Проверяем количество записей в существующих таблицах
        const tableCounts: Record<string, number | string> = {}
        for (const tableName of existingTables) {
            try {
                const { count, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true })

                if (!error) {
                    tableCounts[tableName] = count || 0
                }
            } catch (err) {
                tableCounts[tableName] = 'error'
            }
        }

        console.log('✅ Проверка таблиц завершена')

        return NextResponse.json({
            success: true,
            existingTables,
            nonExistingTables,
            tableCounts,
            summary: {
                total: tablesToCheck.length,
                existing: existingTables.length,
                missing: nonExistingTables.length
            }
        })

    } catch (error) {
        console.error('❌ Ошибка проверки таблиц:', error)
        return NextResponse.json({
            success: false,
            error: 'Ошибка проверки таблиц',
            details: error instanceof Error ? error.message : 'Неизвестная ошибка'
        }, { status: 500 })
    }
}
