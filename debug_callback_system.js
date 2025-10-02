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

async function debugCallbackSystem() {
    log.section('🔍 ДИАГНОСТИКА СИСТЕМЫ CALLBACK');
    
    const testEmail = 'artemkhludov@gmail.com';
    const testPhone = '17472063527';
    
    try {
        // 1. Проверяем существующих пользователей
        log.test('Проверка существующих пользователей...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${testEmail},phone.eq.${testPhone}`);
        
        if (usersError) {
            log.error(`Ошибка получения пользователей: ${usersError.message}`);
        } else {
            log.info(`Найдено пользователей: ${users?.length || 0}`);
            users?.forEach((user, index) => {
                console.log(`  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Phone: ${user.phone}, Role: ${user.role}`);
            });
        }
        
        // 2. Проверяем существующие заявки
        log.test('Проверка существующих заявок...');
        const { data: callbacks, error: callbacksError } = await supabase
            .from('callback_requests')
            .select('*')
            .or(`email.eq.${testEmail},phone.eq.${testPhone}`)
            .order('created_at', { ascending: false });
        
        if (callbacksError) {
            log.error(`Ошибка получения заявок: ${callbacksError.message}`);
        } else {
            log.info(`Найдено заявок: ${callbacks?.length || 0}`);
            callbacks?.forEach((callback, index) => {
                console.log(`  ${index + 1}. ID: ${callback.id}, Email: ${callback.email}, Phone: ${callback.phone}, Status: ${callback.status}, Created: ${callback.created_at}`);
            });
        }
        
        // 3. Проверяем уведомления
        log.test('Проверка уведомлений...');
        const { data: notifications, error: notificationsError } = await supabase
            .from('callback_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (notificationsError) {
            log.error(`Ошибка получения уведомлений: ${notificationsError.message}`);
        } else {
            log.info(`Найдено уведомлений: ${notifications?.length || 0}`);
            notifications?.forEach((notification, index) => {
                console.log(`  ${index + 1}. ID: ${notification.id}, Type: ${notification.notification_type}, Status: ${notification.status}, Created: ${notification.created_at}`);
            });
        }
        
        // 4. Проверяем структуру таблиц
        log.test('Проверка структуры таблиц...');
        
        // Проверяем таблицу users
        const { data: usersStructure, error: usersStructureError } = await supabase
            .from('users')
            .select('*')
            .limit(1);
        
        if (usersStructureError) {
            log.error(`Ошибка проверки структуры users: ${usersStructureError.message}`);
        } else {
            log.success('Таблица users доступна');
            if (usersStructure && usersStructure.length > 0) {
                const columns = Object.keys(usersStructure[0]);
                log.info(`Колонки users: ${columns.join(', ')}`);
            }
        }
        
        // Проверяем таблицу callback_requests
        const { data: callbacksStructure, error: callbacksStructureError } = await supabase
            .from('callback_requests')
            .select('*')
            .limit(1);
        
        if (callbacksStructureError) {
            log.error(`Ошибка проверки структуры callback_requests: ${callbacksStructureError.message}`);
        } else {
            log.success('Таблица callback_requests доступна');
            if (callbacksStructure && callbacksStructure.length > 0) {
                const columns = Object.keys(callbacksStructure[0]);
                log.info(`Колонки callback_requests: ${columns.join(', ')}`);
            }
        }
        
        // 5. Проверяем триггеры
        log.test('Проверка триггеров...');
        const { data: triggers, error: triggersError } = await supabase
            .rpc('get_triggers_info');
        
        if (triggersError) {
            log.warning(`Не удалось получить информацию о триггерах: ${triggersError.message}`);
            log.info('Это нормально, если функция get_triggers_info не существует');
        } else {
            log.info(`Найдено триггеров: ${triggers?.length || 0}`);
        }
        
        log.section('📋 РЕКОМЕНДАЦИИ:');
        
        if (users && users.length > 0) {
            log.warning('⚠️ Пользователь уже существует в базе данных');
            log.info('💡 Нужно обновить логику callback API для обработки существующих пользователей');
        }
        
        if (callbacks && callbacks.length > 0) {
            log.info('📋 Есть существующие заявки - система частично работает');
        }
        
        if (!notifications || notifications.length === 0) {
            log.warning('⚠️ Нет уведомлений - возможно, триггеры не работают');
        }
        
    } catch (error) {
        log.error(`❌ Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    debugCallbackSystem();
}
