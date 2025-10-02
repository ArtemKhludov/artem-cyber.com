require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseInternal() {
    log.section('🔍 ПОЛНАЯ ПРОВЕРКА БАЗЫ ДАННЫХ ИЗНУТРИ');
    
    try {
        // 1. ПРОВЕРЯЕМ ТАБЛИЦЫ
        log.section('📋 ПРОВЕРКА ТАБЛИЦ');
        
        const requiredTables = ['users', 'callback_requests', 'callback_conversations', 'crm_users', 'callback_notifications'];
        
        for (const tableName of requiredTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    log.error(`❌ Таблица ${tableName}: ${error.message}`);
                } else {
                    log.success(`✅ Таблица ${tableName} существует`);
                }
            } catch (err) {
                log.error(`❌ Таблица ${tableName}: ${err.message}`);
            }
        }

        // 2. ПРОВЕРЯЕМ СТРУКТУРУ CALLBACK_REQUESTS
        log.section('🏗️ СТРУКТУРА CALLBACK_REQUESTS');
        
        try {
            const { data, error } = await supabase
                .from('callback_requests')
                .select('conversation_count, last_message_at, last_message_by, priority, tags')
                .limit(1);
            
            if (error) {
                log.warning(`⚠️ Поля не добавлены в callback_requests: ${error.message}`);
            } else {
                log.success('✅ Поля добавлены в callback_requests');
            }
        } catch (err) {
            log.warning(`⚠️ Ошибка проверки полей callback_requests: ${err.message}`);
        }

        // 3. ПРОВЕРЯЕМ ОГРАНИЧЕНИЯ CRM_USERS
        log.section('🔒 ОГРАНИЧЕНИЯ CRM_USERS');
        
        try {
            // Пробуем вставить дубликат email
            const testEmail = 'test-duplicate-check@example.com';
            
            // Первая вставка
            const { data: firstInsert, error: firstError } = await supabase
                .from('crm_users')
                .insert([{ email: testEmail, name: 'Тест 1', phone: '111' }])
                .select();
            
            if (firstError) {
                log.warning(`⚠️ Первая вставка: ${firstError.message}`);
            } else {
                log.success('✅ Первая вставка успешна');
                
                // Вторая вставка (должна вызвать ошибку уникальности)
                const { data: secondInsert, error: secondError } = await supabase
                    .from('crm_users')
                    .insert([{ email: testEmail, name: 'Тест 2', phone: '222' }])
                    .select();
                
                if (secondError && secondError.message.includes('unique')) {
                    log.success('✅ Уникальное ограничение на email работает');
                } else {
                    log.warning(`⚠️ Уникальное ограничение не работает: ${secondError?.message || 'Нет ошибки'}`);
                }
                
                // Удаляем тестовую запись
                await supabase.from('crm_users').delete().eq('email', testEmail);
            }
        } catch (err) {
            log.error(`❌ Ошибка проверки ограничений: ${err.message}`);
        }

        // 4. ПРОВЕРЯЕМ ФУНКЦИИ
        log.section('⚙️ ПРОВЕРКА ФУНКЦИЙ');
        
        const requiredFunctions = [
            'crm_users_upsert',
            'create_user_from_callback', 
            'create_issue_from_callback',
            'update_callback_conversation_count',
            'get_user_callbacks',
            'get_callback_conversation'
        ];
        
        for (const funcName of requiredFunctions) {
            try {
                if (funcName === 'crm_users_upsert') {
                    const { data, error } = await supabase.rpc(funcName, {
                        p_email: 'test-function@example.com',
                        p_name: 'Тест Функции',
                        p_phone: '1234567890'
                    });
                    
                    if (error) {
                        log.error(`❌ Функция ${funcName}: ${error.message}`);
                    } else {
                        log.success(`✅ Функция ${funcName} работает`);
                    }
                } else {
                    // Для других функций просто проверяем существование
                    log.info(`ℹ️ Функция ${funcName} - проверка через SQL`);
                }
            } catch (err) {
                log.error(`❌ Функция ${funcName}: ${err.message}`);
            }
        }

        // 5. ТЕСТИРУЕМ CALLBACK API
        log.section('🧪 ТЕСТИРОВАНИЕ CALLBACK API');
        
        try {
            const testData = {
                name: 'Тест API',
                email: 'test-api@example.com',
                phone: '1234567890',
                message: 'Тест API после проверки БД',
                source_page: '/test',
                product_type: 'callback'
            };

            const response = await fetch('http://localhost:3000/api/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            const result = await response.json();

            if (response.ok) {
                log.success('✅ Callback API работает');
                log.info(`  - ID заявки: ${result.data?.id}`);
                log.info(`  - User ID: ${result.data?.user_id || 'NULL'}`);
            } else {
                log.error(`❌ Callback API ошибка: ${result.error}`);
            }
        } catch (err) {
            log.error(`❌ Ошибка тестирования API: ${err.message}`);
        }

        // 6. ПРОВЕРЯЕМ ТРИГГЕРЫ (через тест вставки)
        log.section('🔧 ПРОВЕРКА ТРИГГЕРОВ');
        
        try {
            // Проверяем, создается ли запись в crm_users при вставке в callback_requests
            const { data: callbackData, error: callbackError } = await supabase
                .from('callback_requests')
                .insert([{
                    name: 'Тест Триггеров',
                    email: 'test-triggers@example.com',
                    phone: '1234567890',
                    message: 'Тест триггеров',
                    source_page: '/test',
                    product_type: 'callback'
                }])
                .select()
                .single();

            if (callbackError) {
                log.error(`❌ Ошибка вставки callback: ${callbackError.message}`);
            } else {
                log.success('✅ Callback вставка работает');
                
                // Проверяем, создалась ли запись в crm_users
                const { data: crmData, error: crmError } = await supabase
                    .from('crm_users')
                    .select('*')
                    .eq('email', 'test-triggers@example.com')
                    .single();

                if (crmError) {
                    log.warning(`⚠️ Триггер crm_users не сработал: ${crmError.message}`);
                } else {
                    log.success('✅ Триггер crm_users работает');
                }
                
                // Удаляем тестовые данные
                await supabase.from('callback_requests').delete().eq('id', callbackData.id);
                if (crmData) {
                    await supabase.from('crm_users').delete().eq('id', crmData.id);
                }
            }
        } catch (err) {
            log.error(`❌ Ошибка проверки триггеров: ${err.message}`);
        }

        // 7. ИТОГОВЫЙ СТАТУС
        log.section('📊 ИТОГОВЫЙ СТАТУС СИСТЕМЫ');
        log.info('Проверка завершена. Смотрите результаты выше.');
        
    } catch (error) {
        log.error(`❌ Критическая ошибка: ${error.message}`);
    }
}

checkDatabaseInternal();
