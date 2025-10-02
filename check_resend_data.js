#!/usr/bin/env node

const { Resend } = require('resend');

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

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

async function checkResendData() {
    log.section('🔍 ПРОВЕРКА ДАННЫХ RESEND');
    
    // Проверяем API ключ
    if (!process.env.RESEND_API_KEY) {
        log.error('RESEND_API_KEY не найден в .env.local');
        return;
    }
    
    log.info(`🔑 API Key: ${process.env.RESEND_API_KEY.substring(0, 10)}...`);
    log.info(`📧 Sender Email: ${process.env.NOTIFY_SENDER_EMAIL || 'не настроен'}`);
    
    try {
        // Тестируем API ключ - пробуем отправить тестовое письмо
        log.test('Тестирование API ключа...');
        const { data, error } = await resend.emails.send({
            from: 'EnergyLogic <onboarding@resend.dev>',
            to: ['artemkhludov@gmail.com'],
            subject: 'Тест API ключа Resend',
            html: '<p>Тест API ключа</p>',
            text: 'Тест API ключа'
        });

        if (error) {
            log.error(`❌ API ключ не работает: ${error.message}`);
            
            if (error.message.includes('restricted')) {
                log.warning('⚠️ API ключ ограничен только отправкой email');
                log.info('💡 Нужен полный API ключ для управления доменами');
            } else if (error.message.includes('invalid')) {
                log.error('❌ API ключ недействителен');
            } else if (error.message.includes('quota')) {
                log.warning('⚠️ Превышен лимит отправки');
            }
            
            log.section('🔧 ИНСТРУКЦИИ ПО ИСПРАВЛЕНИЮ:');
            log.info('1. Войдите в https://resend.com');
            log.info('2. Перейдите в Settings → API Keys');
            log.info('3. Создайте новый API ключ с полными правами');
            log.info('4. Обновите RESEND_API_KEY в .env.local');
            log.info('5. Перезапустите этот скрипт');
            
            return;
        }

        log.success('✅ API ключ работает!');
        log.info(`📧 Тестовое письмо отправлено: ${data.id}`);

        // Пробуем получить информацию о доменах
        log.test('Проверка доступа к доменам...');
        try {
            const { data: domains, error: domainsError } = await resend.domains.list();
            
            if (domainsError) {
                if (domainsError.message.includes('restricted')) {
                    log.warning('⚠️ API ключ ограничен - нет доступа к управлению доменами');
                    log.info('💡 Для верификации домена нужен полный API ключ');
                } else {
                    log.error(`❌ Ошибка получения доменов: ${domainsError.message}`);
                }
            } else {
                log.success('✅ Доступ к доменам есть!');
                log.info(`📊 Найдено доменов: ${domains.data.length}`);
                
                domains.data.forEach(domain => {
                    log.info(`   🌐 ${domain.name} - ${domain.status}`);
                });
            }
        } catch (domainError) {
            log.warning('⚠️ Не удалось проверить домены');
        }

        // Проверяем настройки отправителя
        const senderEmail = process.env.NOTIFY_SENDER_EMAIL;
        if (senderEmail) {
            log.test('Проверка email отправителя...');
            const domain = senderEmail.split('@')[1];
            log.info(`🌐 Домен отправителя: ${domain}`);
            
            if (domain === 'resend.dev') {
                log.warning('⚠️ Используется тестовый домен resend.dev');
                log.info('💡 Для продакшена нужен собственный верифицированный домен');
            } else {
                log.info(`📧 Отправитель: ${senderEmail}`);
                log.info('💡 Убедитесь, что домен верифицирован в Resend');
            }
        }

        log.section('📋 СТАТУС ПРОВЕРКИ:');
        log.success('✅ API ключ работает');
        log.info('📧 Можно отправлять email');
        
        if (process.env.NOTIFY_SENDER_EMAIL?.includes('resend.dev')) {
            log.warning('⚠️ Используется тестовый домен');
            log.info('💡 Для отправки на любые email нужен верифицированный домен');
        }

    } catch (error) {
        log.error(`❌ Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    checkResendData();
}
