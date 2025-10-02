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

async function checkCrmUsersStructure() {
    log.section('🔍 ПРОВЕРКА СТРУКТУРЫ CRM_USERS');
    
    try {
        // 1. Проверяем структуру таблицы crm_users
        log.test('Проверка структуры таблицы crm_users...');
        const { data: crmUsers, error: crmError } = await supabase
            .from('crm_users')
            .select('*')
            .limit(1);
        
        if (crmError) {
            log.error(`❌ Ошибка доступа к crm_users: ${crmError.message}`);
        } else {
            log.success('✅ Таблица crm_users доступна');
        }

        // 2. Проверяем ограничения уникальности
        log.test('Проверка ограничений уникальности...');
        const { data: constraints, error: constraintError } = await supabase
            .rpc('get_table_constraints', { table_name: 'crm_users' });
        
        if (constraintError) {
            log.warning(`⚠️ Не удалось получить ограничения: ${constraintError.message}`);
        } else {
            log.success(`✅ Найдено ограничений: ${constraints?.length || 0}`);
            if (constraints && constraints.length > 0) {
                constraints.forEach(constraint => {
                    log.info(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
                });
            }
        }

        // 3. Тестируем простую вставку в crm_users
        log.test('Тестирование вставки в crm_users...');
        const testCrmData = {
            email: 'test-crm@example.com',
            name: 'Тест CRM',
            phone: '1234567890'
        };

        const { data: crmData, error: crmInsertError } = await supabase
            .from('crm_users')
            .insert([testCrmData])
            .select()
            .single();

        if (crmInsertError) {
            log.error(`❌ Ошибка вставки в crm_users: ${crmInsertError.message}`);
        } else {
            log.success('✅ Вставка в crm_users успешна');
            log.info(`  - ID: ${crmData.id}`);
            
            // Удаляем тестовую запись
            await supabase.from('crm_users').delete().eq('id', crmData.id);
            log.info('  - Тестовая запись удалена');
        }

        // 4. Проверяем существующие записи в crm_users
        log.test('Проверка существующих записей в crm_users...');
        const { data: existingCrm, error: existingError } = await supabase
            .from('crm_users')
            .select('*')
            .limit(5);
        
        if (existingError) {
            log.warning(`⚠️ Не удалось получить записи: ${existingError.message}`);
        } else {
            log.success(`✅ Найдено записей в crm_users: ${existingCrm?.length || 0}`);
            if (existingCrm && existingCrm.length > 0) {
                existingCrm.forEach(record => {
                    log.info(`  - ${record.email} (${record.name})`);
                });
            }
        }

    } catch (error) {
        log.error(`❌ Ошибка проверки: ${error.message}`);
    }
}

checkCrmUsersStructure();