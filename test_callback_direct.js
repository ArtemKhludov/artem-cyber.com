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

async function testCallbackDirect() {
    log.section('🧪 ПРЯМОЙ ТЕСТ CALLBACK В БД');
    
    const testData = {
        name: 'Тест Пользователь',
        phone: '17472063527',
        email: 'artemkhludov@gmail.com',
        preferred_time: 'Утром',
        message: 'Прямой тест вставки в БД',
        source_page: '/test',
        product_type: 'callback',
        product_name: 'Тест заявка',
        source: 'test',
        status: 'new'
    };
    
    try {
        log.test('Попытка прямой вставки в callback_requests...');
        
        const { data, error } = await supabase
            .from('callback_requests')
            .insert([testData])
            .select()
            .single();
        
        if (error) {
            log.error(`Ошибка вставки: ${error.message}`);
            log.info(`Детали ошибки: ${JSON.stringify(error, null, 2)}`);
            
            // Проверяем, есть ли запись в crm_users
            log.test('Проверяем crm_users...');
            const { data: crmUsers, error: crmError } = await supabase
                .from('crm_users')
                .select('*')
                .eq('email', testData.email);
            
            if (crmError) {
                log.error(`Ошибка проверки crm_users: ${crmError.message}`);
            } else {
                log.info(`Найдено записей в crm_users: ${crmUsers?.length || 0}`);
                crmUsers?.forEach((user, index) => {
                    console.log(`  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
                });
            }
        } else {
            log.success('✅ Заявка успешно создана!');
            log.info(`ID заявки: ${data.id}`);
            log.info(`User ID: ${data.user_id}`);
            log.info(`Auto created user: ${data.auto_created_user}`);
        }
        
    } catch (error) {
        log.error(`❌ Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    testCallbackDirect();
}
