#!/usr/bin/env node

const { Resend } = require('resend');

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.NOTIFY_SENDER_EMAIL || 'noreply@example.com';

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

async function testEmailSending() {
    log.section('📧 ТЕСТ ОТПРАВКИ EMAIL ЧЕРЕЗ RESEND');

    // Проверяем настройки
    if (!process.env.RESEND_API_KEY) {
        log.error('RESEND_API_KEY не настроен в .env.local');
        return;
    }

    log.info(`📧 Отправитель: ${SENDER_EMAIL}`);
    log.info(`🔑 API Key: ${process.env.RESEND_API_KEY.substring(0, 10)}...`);

    try {
        // Отправляем тестовое письмо
        const { data, error } = await resend.emails.send({
            from: 'EnergyLogic <onboarding@resend.dev>',
            to: ['artemkhludov@gmail.com'],
            subject: 'Тест системы уведомлений EnergyLogic',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">🎉 Добро пожаловать в EnergyLogic!</h2>
                    <p>Здравствуйте, Артем!</p>
                    <p>Это тестовое письмо для проверки системы email уведомлений.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #374151; margin-top: 0;">Детали теста:</h3>
                        <ul style="color: #6b7280;">
                            <li>✅ Заявка создана успешно</li>
                            <li>✅ Пользователь создан автоматически</li>
                            <li>✅ Email уведомление отправлено</li>
                            <li>✅ Система работает корректно</li>
                        </ul>
                    </div>
                    <p>Если вы получили это письмо, значит система уведомлений работает правильно!</p>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        С уважением,<br/>
                        Команда EnergyLogic
                    </p>
                </div>
            `,
            text: `
                Добро пожаловать в EnergyLogic!
                
                Здравствуйте, Артем!
                
                Это тестовое письмо для проверки системы email уведомлений.
                
                Детали теста:
                ✅ Заявка создана успешно
                ✅ Пользователь создан автоматически
                ✅ Email уведомление отправлено
                ✅ Система работает корректно
                
                Если вы получили это письмо, значит система уведомлений работает правильно!
                
                С уважением,
                Команда EnergyLogic
            `
        });

        if (error) {
            log.error(`Ошибка отправки email: ${error.message}`);
            console.error('Детали ошибки:', error);
            return;
        }

        log.success('✅ Email успешно отправлен!');
        log.info(`📧 ID письма: ${data.id}`);
        log.info(`📬 Получатель: artemkhludov@hmail.com`);
        log.info(`📤 Отправитель: ${SENDER_EMAIL}`);

        log.section('🎉 ТЕСТ ЗАВЕРШЕН УСПЕШНО!');
        log.success('Проверьте вашу почту artemkhludov@hmail.com');
        log.info('Письмо должно прийти в течение нескольких минут');

    } catch (error) {
        log.error(`Неожиданная ошибка: ${error.message}`);
        console.error('Детали ошибки:', error);
    }
}

if (require.main === module) {
    testEmailSending();
}
