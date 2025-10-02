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

async function directSupabaseCheck() {
    log.section('🔍 ПРЯМОЙ ДОСТУП К SUPABASE');
    
    try {
        // 1. Проверяем все записи в crm_users
        log.test('Все записи в crm_users:');
        const { data: allCrmUsers, error: allError } = await supabase
            .from('crm_users')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (allError) {
            log.error(`Ошибка получения записей: ${allError.message}`);
        } else {
            log.info(`Найдено ${allCrmUsers.length} записей в crm_users:`);
            allCrmUsers.forEach((record, index) => {
                log.info(`${index + 1}. ${record.email} | ${record.phone} | ${record.name} | ${record.created_at}`);
            });
        }

        // 2. Проверяем записи с проблемным телефоном
        log.test('Записи с телефоном 1234567890:');
        const { data: phoneRecords, error: phoneError } = await supabase
            .from('crm_users')
            .select('*')
            .eq('phone', '1234567890');
        
        if (phoneError) {
            log.error(`Ошибка поиска по телефону: ${phoneError.message}`);
        } else {
            log.info(`Найдено ${phoneRecords.length} записей с телефоном 1234567890:`);
            phoneRecords.forEach((record, index) => {
                log.info(`${index + 1}. ${record.email} | ${record.phone} | ${record.name} | ID: ${record.id}`);
            });
        }

        // 3. Проверяем записи с тестовыми email
        log.test('Записи с тестовыми email:');
        const { data: testRecords, error: testError } = await supabase
            .from('crm_users')
            .select('*')
            .like('email', '%test%')
            .order('created_at', { ascending: false });
        
        if (testError) {
            log.error(`Ошибка поиска тестовых записей: ${testError.message}`);
        } else {
            log.info(`Найдено ${testRecords.length} тестовых записей:`);
            testRecords.forEach((record, index) => {
                log.info(`${index + 1}. ${record.email} | ${record.phone} | ${record.name} | ID: ${record.id}`);
            });
        }

        // 4. Удаляем все тестовые записи
        log.test('Удаляем все тестовые записи...');
        const { data: deleteData, error: deleteError } = await supabase
            .from('crm_users')
            .delete()
            .like('email', '%test%')
            .select();
        
        if (deleteError) {
            log.error(`Ошибка удаления тестовых записей: ${deleteError.message}`);
        } else {
            log.success(`Удалено ${deleteData.length} тестовых записей`);
        }

        // 5. Проверяем callback_requests
        log.test('Записи в callback_requests:');
        const { data: callbackRecords, error: callbackError } = await supabase
            .from('callback_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (callbackError) {
            log.error(`Ошибка получения callback_requests: ${callbackError.message}`);
        } else {
            log.info(`Найдено ${callbackRecords.length} записей в callback_requests:`);
            callbackRecords.forEach((record, index) => {
                log.info(`${index + 1}. ${record.name} | ${record.email} | ${record.phone} | ${record.status} | ID: ${record.id}`);
            });
        }

        // 6. Тестируем функцию crm_users_upsert напрямую
        log.test('Тестируем функцию crm_users_upsert:');
        const { data: functionTest, error: functionError } = await supabase
            .rpc('crm_users_upsert', {
                p_email: 'direct-test@example.com',
                p_name: 'Прямой Тест',
                p_phone: '9999999999'
            });
        
        if (functionError) {
            log.error(`Ошибка функции crm_users_upsert: ${functionError.message}`);
        } else {
            log.success(`Функция работает! Результат: ${functionTest}`);
        }

        // 7. Проверяем callback_notifications
        log.test('Записи в callback_notifications:');
        const { data: notificationRecords, error: notificationError } = await supabase
            .from('callback_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (notificationError) {
            log.error(`Ошибка получения callback_notifications: ${notificationError.message}`);
        } else {
            log.info(`Найдено ${notificationRecords.length} записей в callback_notifications:`);
            notificationRecords.forEach((record, index) => {
                log.info(`${index + 1}. ${record.notification_type} | ${record.channel} | ${record.status} | ID: ${record.id}`);
            });
        }

    } catch (error) {
        log.error(`❌ Критическая ошибка: ${error.message}`);
    }
}

directSupabaseCheck();
