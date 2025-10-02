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

async function getDNSRecords() {
    log.section('🌐 ПОЛУЧЕНИЕ DNS ЗАПИСЕЙ ДЛЯ NAMECHEAP');
    
    try {
        // Пробуем получить список доменов
        const { data: domains, error } = await resend.domains.list();
        
        if (error) {
            log.error(`❌ Ошибка получения доменов: ${error.message}`);
            
            if (error.message.includes('restricted')) {
                log.warning('⚠️ API ключ ограничен - нет доступа к доменам');
                log.section('📋 РУЧНАЯ ИНСТРУКЦИЯ:');
                log.info('1. Войдите в https://resend.com/domains');
                log.info('2. Найдите домен energylogic-ai.com');
                log.info('3. Скопируйте DNS записи');
                log.info('4. Добавьте их в Namecheap');
                
                log.section('🔧 ОБЫЧНЫЕ DNS ЗАПИСИ ДЛЯ RESEND:');
                console.log(`
${colors.cyan}1. SPF запись:${colors.reset}
   ${colors.yellow}Type:${colors.reset} TXT
   ${colors.yellow}Host:${colors.reset} @
   ${colors.yellow}Value:${colors.reset} v=spf1 include:resend.com ~all

${colors.cyan}2. DKIM запись:${colors.reset}
   ${colors.yellow}Type:${colors.reset} TXT
   ${colors.yellow}Host:${colors.reset} resend._domainkey
   ${colors.yellow}Value:${colors.reset} [получите из панели Resend]

${colors.cyan}3. CNAME запись:${colors.reset}
   ${colors.yellow}Type:${colors.reset} CNAME
   ${colors.yellow}Host:${colors.reset} resend
   ${colors.yellow}Value:${colors.reset} resend.com
                `);
                
                log.section('📝 ИНСТРУКЦИЯ ДЛЯ NAMECHEAP:');
                log.info('1. Войдите в https://www.namecheap.com');
                log.info('2. Domain List → Manage → energylogic-ai.com');
                log.info('3. Advanced DNS');
                log.info('4. Добавьте записи выше');
                log.info('5. Подождите 5-10 минут');
                log.info('6. Проверьте статус в Resend');
                
            }
            return;
        }

        // Ищем наш домен
        const ourDomain = domains.data.find(d => d.name === 'energylogic-ai.com');
        if (!ourDomain) {
            log.error('❌ Домен energylogic-ai.com не найден');
            log.info('💡 Убедитесь, что домен добавлен в Resend');
            return;
        }

        log.success(`✅ Домен найден: ${ourDomain.name}`);
        log.info(`📊 Статус: ${ourDomain.status}`);
        log.info(`🆔 ID: ${ourDomain.id}`);

        if (ourDomain.records && ourDomain.records.length > 0) {
            log.section('📋 DNS ЗАПИСИ ДЛЯ ДОБАВЛЕНИЯ В NAMECHEAP:');
            
            ourDomain.records.forEach((record, index) => {
                console.log(`\n${colors.cyan}${index + 1}. ${record.type} запись:${colors.reset}`);
                console.log(`   ${colors.yellow}Type:${colors.reset} ${record.type}`);
                console.log(`   ${colors.yellow}Host:${colors.reset} ${record.name}`);
                console.log(`   ${colors.yellow}Value:${colors.reset} ${record.value}`);
                console.log(`   ${colors.yellow}TTL:${colors.reset} ${record.ttl || '3600'}`);
            });

            log.section('📝 ИНСТРУКЦИЯ ДЛЯ NAMECHEAP:');
            log.info('1. Войдите в https://www.namecheap.com');
            log.info('2. Domain List → Manage → energylogic-ai.com');
            log.info('3. Advanced DNS');
            log.info('4. Добавьте записи выше (кнопка "Add New Record")');
            log.info('5. Сохраните изменения');
            log.info('6. Подождите 5-10 минут для распространения DNS');
            log.info('7. Проверьте статус в https://resend.com/domains');

        } else {
            log.warning('⚠️ DNS записи не найдены');
            log.info('💡 Возможно, домен еще синхронизируется');
        }

    } catch (error) {
        log.error(`❌ Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    getDNSRecords();
}
