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

async function checkCrmConstraints() {
    log.section('🔍 ПРОВЕРКА ОГРАНИЧЕНИЙ CRM_USERS');
    
    try {
        // 1. Проверяем структуру таблицы crm_users
        log.test('Структура таблицы crm_users:');
        const { data: columns, error: columnsError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'crm_users' 
                    ORDER BY ordinal_position;
                `
            });
        
        if (columnsError) {
            log.warning(`Не удалось получить структуру: ${columnsError.message}`);
        } else {
            columns.forEach(col => {
                log.info(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        // 2. Проверяем все ограничения
        log.test('Все ограничения в crm_users:');
        const { data: constraints, error: constraintsError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT 
                        conname as constraint_name,
                        contype as constraint_type,
                        pg_get_constraintdef(oid) as constraint_definition
                    FROM pg_constraint 
                    WHERE conrelid = 'crm_users'::regclass;
                `
            });
        
        if (constraintsError) {
            log.warning(`Не удалось получить ограничения: ${constraintsError.message}`);
        } else {
            constraints.forEach(constraint => {
                log.info(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
                log.info(`    ${constraint.constraint_definition}`);
            });
        }

        // 3. Проверяем дубликаты телефонов
        log.test('Дубликаты телефонов в crm_users:');
        const { data: phoneDuplicates, error: phoneError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT phone, COUNT(*) as count
                    FROM crm_users 
                    WHERE phone IS NOT NULL AND phone != ''
                    GROUP BY phone 
                    HAVING COUNT(*) > 1;
                `
            });
        
        if (phoneError) {
            log.warning(`Не удалось проверить дубликаты телефонов: ${phoneError.message}`);
        } else if (phoneDuplicates.length > 0) {
            log.warning(`Найдены дубликаты телефонов:`);
            phoneDuplicates.forEach(dup => {
                log.warning(`  - ${dup.phone}: ${dup.count} записей`);
            });
        } else {
            log.success('Дубликатов телефонов не найдено');
        }

        // 4. Проверяем дубликаты email
        log.test('Дубликаты email в crm_users:');
        const { data: emailDuplicates, error: emailError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT email, COUNT(*) as count
                    FROM crm_users 
                    GROUP BY email 
                    HAVING COUNT(*) > 1;
                `
            });
        
        if (emailError) {
            log.warning(`Не удалось проверить дубликаты email: ${emailError.message}`);
        } else if (emailDuplicates.length > 0) {
            log.warning(`Найдены дубликаты email:`);
            emailDuplicates.forEach(dup => {
                log.warning(`  - ${dup.email}: ${dup.count} записей`);
            });
        } else {
            log.success('Дубликатов email не найдено');
        }

        // 5. Показываем все записи с тестовыми данными
        log.test('Записи с тестовыми данными:');
        const { data: testRecords, error: testError } = await supabase
            .from('crm_users')
            .select('*')
            .or('email.like.%test%,phone.like.%1234567890%')
            .limit(10);
        
        if (testError) {
            log.warning(`Не удалось получить тестовые записи: ${testError.message}`);
        } else {
            log.info(`Найдено ${testRecords.length} тестовых записей:`);
            testRecords.forEach(record => {
                log.info(`  - ${record.email} | ${record.phone} | ${record.name}`);
            });
        }

    } catch (error) {
        log.error(`❌ Критическая ошибка: ${error.message}`);
    }
}

checkCrmConstraints();
