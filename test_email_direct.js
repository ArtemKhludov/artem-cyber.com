#!/usr/bin/env node

const axios = require('axios');

// Конфигурация
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

// Генерируем уникальные тестовые данные
const generateTestData = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const email = `email-test-${timestamp}-${random}@example.com`;
    const phone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    return {
        callbackRequest: {
            name: 'Тестовый Пользователь',
            phone: phone,
            email: email,
            message: 'Тест отправки email уведомлений',
            preferred_time: 'Утром',
            source_page: '/test',
            product_type: 'email_test'
        }
    };
};

class EmailTester {
    constructor() {
        this.client = axios.create({
            baseURL: BASE_URL,
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            }
        });
        this.testData = generateTestData();
        this.callbackId = null;
    }

    async testCallbackCreation() {
        log.test('Создание callback заявки для тестирования email');

        const response = await this.client.post('/api/callback', this.testData.callbackRequest);

        if (response.status !== 200) {
            throw new Error(`Request failed with status code ${response.status}`);
        }
        if (!response.data.success) {
            throw new Error(`Callback creation failed: ${JSON.stringify(response.data)}`);
        }

        this.callbackId = response.data.data.id;
        log.info(`📋 ID заявки: ${this.callbackId}`);
        log.info(`👤 User ID: ${response.data.data.user_id}`);
        log.info(`📧 Email: ${response.data.data.email}`);
        log.info(`🔄 Auto created user: ${response.data.data.auto_created_user}`);

        return response.data.data;
    }

    async testNotificationProcessing() {
        log.test('Обработка уведомлений для отправки email');

        const response = await this.client.get('/api/cron/process-notifications', {
            headers: {
                Authorization: `Bearer test-secret-1759434411`
            }
        });

        if (response.status !== 200) {
            throw new Error(`Request failed with status code ${response.status}`);
        }
        if (!response.data.success) {
            throw new Error(`Notification processing failed: ${JSON.stringify(response.data)}`);
        }

        log.info(`⚙️ Обработано уведомлений: ${response.data.processed}, ошибок: ${response.data.errors}`);

        if (response.data.processed > 0) {
            log.success(`✅ Email уведомления отправлены успешно!`);
        } else if (response.data.total === 0) {
            log.warning(`⚠️ Нет pending уведомлений для обработки`);
        } else {
            log.error(`❌ Уведомления не были обработаны`);
        }

        return response.data;
    }

    async runTest() {
        log.section('📧 ТЕСТ ОТПРАВКИ EMAIL УВЕДОМЛЕНИЙ');

        try {
            await this.testCallbackCreation();
            await this.testNotificationProcessing();

            log.section('🎉 ТЕСТ ЗАВЕРШЕН УСПЕШНО!');
            log.success('Email уведомления должны быть отправлены на указанный адрес');
            log.info(`Проверьте почту: ${this.testData.callbackRequest.email}`);

        } catch (error) {
            log.error(`Тест провален: ${error.message}`);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    const tester = new EmailTester();
    tester.runTest();
}
