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

async function checkTriggersAndPolicies() {
    log.section('🔍 ПРОВЕРКА ТРИГГЕРОВ И ПОЛИТИК');
    
    try {
        // 1. Проверяем триггеры через прямой SQL запрос
        log.test('Проверка триггеров...');
        const { data: triggers, error: triggerError } = await supabase
            .from('information_schema.triggers')
            .select('trigger_name, event_manipulation, action_statement')
            .in('event_object_table', ['callback_requests', 'callback_conversations']);
        
        if (triggerError) {
            log.warning(`⚠️ Не удалось проверить триггеры: ${triggerError.message}`);
        } else {
            log.success(`✅ Найдено триггеров: ${triggers?.length || 0}`);
            if (triggers && triggers.length > 0) {
                triggers.forEach(trigger => {
                    log.info(`  - ${trigger.trigger_name} (${trigger.event_manipulation})`);
                });
            } else {
                log.warning('⚠️ Триггеры не найдены!');
            }
        }

        // 2. Проверяем RLS политики
        log.test('Проверка RLS политик...');
        const { data: policies, error: policyError } = await supabase
            .from('pg_policies')
            .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
            .eq('tablename', 'callback_conversations');
        
        if (policyError) {
            log.warning(`⚠️ Не удалось проверить RLS политики: ${policyError.message}`);
        } else {
            log.success(`✅ Найдено RLS политик: ${policies?.length || 0}`);
            if (policies && policies.length > 0) {
                policies.forEach(policy => {
                    log.info(`  - ${policy.policyname} (${policy.cmd})`);
                });
            } else {
                log.warning('⚠️ RLS политики не найдены!');
            }
        }

        // 3. Проверяем функции
        log.test('Проверка функций...');
        const { data: functions, error: funcError } = await supabase
            .from('pg_proc')
            .select('proname, prosrc')
            .in('proname', ['create_user_from_callback', 'create_issue_from_callback', 'update_callback_conversation_count', 'crm_users_upsert']);
        
        if (funcError) {
            log.warning(`⚠️ Не удалось проверить функции: ${funcError.message}`);
        } else {
            log.success(`✅ Найдено функций: ${functions?.length || 0}`);
            if (functions && functions.length > 0) {
                functions.forEach(func => {
                    log.info(`  - ${func.proname}`);
                });
            } else {
                log.warning('⚠️ Функции не найдены!');
            }
        }

        // 4. Тестируем создание callback запроса
        log.test('Тестирование создания callback запроса...');
        const testData = {
            name: 'Тест Триггеров',
            email: 'test-triggers@example.com',
            phone: '1234567890',
            message: 'Тест триггеров и функций',
            source_page: '/test',
            product_type: 'callback'
        };

        const { data: callbackData, error: callbackError } = await supabase
            .from('callback_requests')
            .insert([testData])
            .select()
            .single();

        if (callbackError) {
            log.error(`❌ Ошибка создания callback: ${callbackError.message}`);
        } else {
            log.success('✅ Callback запрос создан успешно');
            log.info(`  - ID: ${callbackData.id}`);
            log.info(`  - User ID: ${callbackData.user_id || 'NULL'}`);
            log.info(`  - Auto created user: ${callbackData.auto_created_user}`);
            
            // Удаляем тестовый запрос
            await supabase.from('callback_requests').delete().eq('id', callbackData.id);
            log.info('  - Тестовый запрос удален');
        }

    } catch (error) {
        log.error(`❌ Ошибка проверки: ${error.message}`);
    }
}

checkTriggersAndPolicies();
