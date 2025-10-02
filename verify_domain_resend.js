#!/usr/bin/env node

const { Resend } = require('resend');

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN = 'energylogic-ai.com';

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

async function verifyDomain() {
    log.section('🌐 ВЕРИФИКАЦИЯ ДОМЕНА В RESEND');
    
    // Проверяем настройки
    if (!process.env.RESEND_API_KEY) {
        log.error('RESEND_API_KEY не настроен в .env.local');
        return;
    }
    
    log.info(`🌐 Домен для верификации: ${DOMAIN}`);
    log.info(`🔑 API Key: ${process.env.RESEND_API_KEY.substring(0, 10)}...`);
    
    try {
        // Добавляем домен
        log.test('Добавление домена в Resend...');
        const { data: domainData, error: domainError } = await resend.domains.create({
            name: DOMAIN
        });

        if (domainError) {
            if (domainError.message.includes('already exists')) {
                log.warning('Домен уже существует в Resend');
            } else {
                log.error(`Ошибка добавления домена: ${domainError.message}`);
                console.error('Детали ошибки:', domainError);
                return;
            }
        } else {
            log.success('✅ Домен успешно добавлен в Resend');
            log.info(`📋 ID домена: ${domainData.id}`);
        }

        // Получаем информацию о домене
        log.test('Получение информации о домене...');
        const { data: domains, error: listError } = await resend.domains.list();

        if (listError) {
            log.error(`Ошибка получения списка доменов: ${listError.message}`);
            return;
        }

        const ourDomain = domains.data.find(d => d.name === DOMAIN);
        if (!ourDomain) {
            log.error('Домен не найден в списке');
            return;
        }

        log.info(`📊 Статус домена: ${ourDomain.status}`);
        log.info(`🆔 ID домена: ${ourDomain.id}`);
        log.info(`📅 Создан: ${ourDomain.created_at}`);

        if (ourDomain.status === 'verified') {
            log.success('🎉 Домен уже верифицирован!');
            log.info('✅ Теперь можно отправлять email на любые адреса');
        } else if (ourDomain.status === 'pending') {
            log.warning('⏳ Домен ожидает верификации');
            log.info('📋 DNS записи для добавления:');
            
            if (ourDomain.records) {
                ourDomain.records.forEach(record => {
                    log.info(`   ${record.type}: ${record.name} = ${record.value}`);
                });
            }
            
            log.section('📝 ИНСТРУКЦИИ ПО ВЕРИФИКАЦИИ:');
            log.info('1. Войдите в панель управления вашего DNS провайдера');
            log.info('2. Добавьте DNS записи, указанные выше');
            log.info('3. Подождите 5-10 минут для распространения DNS');
            log.info('4. Запустите этот скрипт снова для проверки статуса');
            log.info('5. Или проверьте статус в панели Resend: https://resend.com/domains');
            
        } else {
            log.warning(`⚠️ Неизвестный статус домена: ${ourDomain.status}`);
        }

        // Показываем DNS записи если они есть
        if (ourDomain.records && ourDomain.records.length > 0) {
            log.section('📋 DNS ЗАПИСИ ДЛЯ ДОБАВЛЕНИЯ:');
            ourDomain.records.forEach((record, index) => {
                console.log(`\n${colors.cyan}${index + 1}. ${record.type} запись:${colors.reset}`);
                console.log(`   ${colors.yellow}Имя:${colors.reset} ${record.name}`);
                console.log(`   ${colors.yellow}Значение:${colors.reset} ${record.value}`);
                console.log(`   ${colors.yellow}TTL:${colors.reset} ${record.ttl || '3600'}`);
            });
        }

    } catch (error) {
        log.error(`Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    verifyDomain();
}
