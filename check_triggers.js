#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Не настроены переменные Supabase');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}`)
};

async function checkTriggers() {
    log.section('🔍 ПРОВЕРКА ТРИГГЕРОВ В БД');
    
    try {
        // Проверяем триггеры на callback_requests
        log.test('Проверяем триггеры на callback_requests...');
        
        const { data: triggers, error: triggersError } = await supabase
            .rpc('exec_sql', {
                sql: `
                    SELECT 
                        trigger_name,
                        event_manipulation,
                        action_timing,
                        action_statement
                    FROM information_schema.triggers 
                    WHERE event_object_table = 'callback_requests'
                    ORDER BY trigger_name;
                `
            });
        
        if (triggersError) {
            log.warning(`Не удалось получить триггеры через RPC: ${triggersError.message}`);
            
            // Альтернативный способ - проверяем функции
            log.test('Проверяем функции...');
            const { data: functions, error: functionsError } = await supabase
                .rpc('exec_sql', {
                    sql: `
                        SELECT 
                            routine_name,
                            routine_type
                        FROM information_schema.routines 
                        WHERE routine_schema = 'public' 
                        AND routine_name LIKE '%callback%'
                        ORDER BY routine_name;
                    `
                });
            
            if (functionsError) {
                log.error(`Не удалось получить функции: ${functionsError.message}`);
            } else {
                log.info(`Найдено функций: ${functions?.length || 0}`);
                functions?.forEach((func, index) => {
                    console.log(`  ${index + 1}. ${func.routine_name} (${func.routine_type})`);
                });
            }
        } else {
            log.info(`Найдено триггеров: ${triggers?.length || 0}`);
            triggers?.forEach((trigger, index) => {
                console.log(`  ${index + 1}. ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
            });
        }
        
        // Проверяем, есть ли функция crm_users_upsert
        log.test('Проверяем функцию crm_users_upsert...');
        const { data: upsertTest, error: upsertError } = await supabase
            .rpc('crm_users_upsert', {
                p_email: 'test@example.com',
                p_name: 'Test User',
                p_phone: '1234567890'
            });
        
        if (upsertError) {
            log.error(`Функция crm_users_upsert не работает: ${upsertError.message}`);
        } else {
            log.success('✅ Функция crm_users_upsert работает!');
            log.info(`Результат: ${upsertTest}`);
        }
        
    } catch (error) {
        log.error(`❌ Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    checkTriggers();
}
