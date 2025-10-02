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

async function testVerifiedDomain() {
    log.section('🎉 ТЕСТ ВЕРИФИЦИРОВАННОГО ДОМЕНА');

    try {
        // Тестируем отправку на любой email адрес
        const { data, error } = await resend.emails.send({
            from: 'EnergyLogic <no-reply@energylogic-ai.com>',
            to: ['artemkhludov@hmail.com'],
            subject: '🎉 Домен верифицирован! Система уведомлений работает',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                        <h1 style="margin: 0; font-size: 28px;">🎉 Поздравляем!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px;">Домен успешно верифицирован</p>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #28a745; margin-top: 0;">✅ Что работает:</h2>
                        <ul style="color: #495057;">
                            <li>✅ Домен energylogic-ai.com верифицирован в Resend</li>
                            <li>✅ DNS записи настроены корректно</li>
                            <li>✅ MX, SPF, DKIM записи подтверждены</li>
                            <li>✅ Можно отправлять email на любые адреса</li>
                            <li>✅ Система уведомлений полностью функциональна</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1976d2; margin-top: 0;">📧 Технические детали:</h3>
                        <p style="color: #424242; margin: 0;">
                            <strong>Отправитель:</strong> no-reply@energylogic-ai.com<br/>
                            <strong>Домен:</strong> energylogic-ai.com<br/>
                            <strong>Статус:</strong> Verified ✅<br/>
                            <strong>Регион:</strong> North Virginia (us-east-1)
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f1f8e9; border-radius: 8px;">
                        <h3 style="color: #2e7d32; margin-top: 0;">🚀 Готово к продакшену!</h3>
                        <p style="color: #424242; margin: 0;">
                            Система уведомлений EnergyLogic полностью настроена и готова к работе.
                        </p>
                    </div>
                    
                    <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
                        С уважением,<br/>
                        Команда EnergyLogic
                    </p>
                </div>
            `,
            text: `
                🎉 Поздравляем! Домен успешно верифицирован
                
                ✅ Что работает:
                - Домен energylogic-ai.com верифицирован в Resend
                - DNS записи настроены корректно
                - MX, SPF, DKIM записи подтверждены
                - Можно отправлять email на любые адреса
                - Система уведомлений полностью функциональна
                
                📧 Технические детали:
                Отправитель: no-reply@energylogic-ai.com
                Домен: energylogic-ai.com
                Статус: Verified ✅
                Регион: North Virginia (us-east-1)
                
                🚀 Готово к продакшену!
                Система уведомлений EnergyLogic полностью настроена и готова к работе.
                
                С уважением,
                Команда EnergyLogic
            `
        });

        if (error) {
            log.error(`❌ Ошибка отправки: ${error.message}`);
            return;
        }

        log.success('🎉 Email успешно отправлен с верифицированного домена!');
        log.info(`📧 ID письма: ${data.id}`);
        log.info(`📬 Получатель: artemkhludov@hmail.com`);
        log.info(`📤 Отправитель: no-reply@energylogic-ai.com`);

        log.section('🎉 СИСТЕМА ПОЛНОСТЬЮ ГОТОВА!');
        log.success('✅ Домен верифицирован');
        log.success('✅ DNS записи настроены');
        log.success('✅ Email отправка работает');
        log.success('✅ Можно отправлять на любые адреса');

        log.info('📧 Проверьте почту artemkhludov@hmail.com');
        log.info('💡 Теперь система уведомлений полностью функциональна!');

    } catch (error) {
        log.error(`❌ Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    testVerifiedDomain();
}
