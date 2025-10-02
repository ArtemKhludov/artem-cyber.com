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

if (!supabaseUrl || !supabaseServiceKey) {
    log.error('❌ Не установлены переменные окружения SUPABASE');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseStructure() {
    log.section('🔍 ПРОВЕРКА СТРУКТУРЫ БАЗЫ ДАННЫХ');
    
    try {
        // 1. Проверяем таблицу callback_conversations
        log.test('Проверка таблицы callback_conversations...');
        const { data: conversations, error: convError } = await supabase
            .from('callback_conversations')
            .select('*')
            .limit(1);
        
        if (convError) {
            log.error(`❌ Таблица callback_conversations не существует: ${convError.message}`);
        } else {
            log.success('✅ Таблица callback_conversations существует');
        }

        // 2. Проверяем поля в callback_requests
        log.test('Проверка полей в callback_requests...');
        const { data: callbacks, error: cbError } = await supabase
            .from('callback_requests')
            .select('conversation_count, last_message_at, last_message_by, priority, tags')
            .limit(1);
        
        if (cbError) {
            log.warning(`⚠️ Поля не добавлены в callback_requests: ${cbError.message}`);
        } else {
            log.success('✅ Поля добавлены в callback_requests');
        }

        // 3. Проверяем функции
        log.test('Проверка функций...');
        const { data: functions, error: funcError } = await supabase.rpc('get_user_callbacks', { user_uuid: '00000000-0000-0000-0000-000000000000' });
        
        if (funcError) {
            log.warning(`⚠️ Функция get_user_callbacks не существует: ${funcError.message}`);
        } else {
            log.success('✅ Функция get_user_callbacks существует');
        }

        // 4. Проверяем представление
        log.test('Проверка представления...');
        const { data: view, error: viewError } = await supabase
            .from('callback_requests_with_conversations')
            .select('*')
            .limit(1);
        
        if (viewError) {
            log.warning(`⚠️ Представление callback_requests_with_conversations не существует: ${viewError.message}`);
        } else {
            log.success('✅ Представление callback_requests_with_conversations существует');
        }

        // 5. Проверяем триггеры через SQL запрос
        log.test('Проверка триггеров...');
        const { data: triggers, error: triggerError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT trigger_name, event_manipulation, action_statement 
                    FROM information_schema.triggers 
                    WHERE event_object_table IN ('callback_requests', 'callback_conversations')
                    ORDER BY trigger_name;
                `
            });
        
        if (triggerError) {
            log.warning(`⚠️ Не удалось проверить триггеры: ${triggerError.message}`);
        } else {
            log.success(`✅ Найдено триггеров: ${triggers?.length || 0}`);
            if (triggers && triggers.length > 0) {
                triggers.forEach(trigger => {
                    log.info(`  - ${trigger.trigger_name} (${trigger.event_manipulation})`);
                });
            }
        }

        // 6. Проверяем RLS политики
        log.test('Проверка RLS политик...');
        const { data: policies, error: policyError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
                    FROM pg_policies 
                    WHERE tablename = 'callback_conversations';
                `
            });
        
        if (policyError) {
            log.warning(`⚠️ Не удалось проверить RLS политики: ${policyError.message}`);
        } else {
            log.success(`✅ Найдено RLS политик: ${policies?.length || 0}`);
            if (policies && policies.length > 0) {
                policies.forEach(policy => {
                    log.info(`  - ${policy.policyname} (${policy.cmd})`);
                });
            }
        }

    } catch (error) {
        log.error(`❌ Ошибка проверки: ${error.message}`);
    }
}

checkDatabaseStructure();
