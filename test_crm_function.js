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

async function testCrmFunction() {
    log.section('🧪 ТЕСТИРОВАНИЕ ФУНКЦИИ CRM_USERS_UPSERT');
    
    try {
        // 1. Проверяем существующую запись с artemkhludov@gmail.com
        log.test('Проверяем существующую запись с artemkhludov@gmail.com:');
        const { data: existingRecord, error: existingError } = await supabase
            .from('crm_users')
            .select('*')
            .eq('email', 'artemkhludov@gmail.com')
            .single();
        
        if (existingError && existingError.code !== 'PGRST116') {
            log.error(`Ошибка поиска: ${existingError.message}`);
        } else if (existingRecord) {
            log.info(`Найдена запись: ${existingRecord.email} | ${existingRecord.phone} | ${existingRecord.name} | ID: ${existingRecord.id}`);
        } else {
            log.info('Запись не найдена');
        }

        // 2. Тестируем функцию crm_users_upsert
        log.test('Тестируем функцию crm_users_upsert:');
        const { data: functionResult, error: functionError } = await supabase
            .rpc('crm_users_upsert', {
                p_email: 'artemkhludov@gmail.com',
                p_name: 'Артем Хлудов',
                p_phone: '17472063527'
            });
        
        if (functionError) {
            log.error(`Ошибка функции: ${functionError.message}`);
        } else {
            log.success(`Функция работает! Результат: ${functionResult}`);
        }

        // 3. Проверяем, что запись обновилась
        log.test('Проверяем обновленную запись:');
        const { data: updatedRecord, error: updatedError } = await supabase
            .from('crm_users')
            .select('*')
            .eq('email', 'artemkhludov@gmail.com')
            .single();
        
        if (updatedError) {
            log.error(`Ошибка получения обновленной записи: ${updatedError.message}`);
        } else {
            log.success(`Обновленная запись: ${updatedRecord.email} | ${updatedRecord.phone} | ${updatedRecord.name} | ID: ${updatedRecord.id}`);
        }

        // 4. Тестируем создание новой записи
        log.test('Тестируем создание новой записи:');
        const { data: newResult, error: newError } = await supabase
            .rpc('crm_users_upsert', {
                p_email: 'new-user@example.com',
                p_name: 'Новый Пользователь',
                p_phone: '9999999999'
            });
        
        if (newError) {
            log.error(`Ошибка создания новой записи: ${newError.message}`);
        } else {
            log.success(`Новая запись создана! ID: ${newResult}`);
        }

    } catch (error) {
        log.error(`❌ Критическая ошибка: ${error.message}`);
    }
}

testCrmFunction();
