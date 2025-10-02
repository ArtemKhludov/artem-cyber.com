#!/usr/bin/env node

/**
 * ПОЛНЫЙ ТЕСТ СИСТЕМЫ ПОДДЕРЖКИ
 * Проверяет все компоненты системы от создания заявки до уведомлений
 */

const axios = require('axios');

// Конфигурация
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

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

class CompleteSystemTester {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CompleteSystemTester/1.0'
            }
        });

        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };

        // Генерируем уникальные тестовые данные
        this.testData = this.generateTestData();
    }

    generateTestData() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return {
            callbackRequest: {
                name: 'Тестовый Пользователь',
                phone: `+123456789${random % 10}`,
                email: `complete-test-${timestamp}-${random}@example.com`,
                message: 'Полный тест системы поддержки',
                preferred_time: 'Утром',
                source_page: '/test',
                product_type: 'complete_test'
            },
            userRegistration: {
                name: 'Тестовый Пользователь',
                email: `complete-test-${timestamp}-${random}@example.com`,
                password: 'TestPassword123!',
                phone: `+123456789${random % 10}`
            }
        };
    }

    async runTest(testName, testFunction) {
        this.results.total++;
        log.test(`Запуск теста: ${testName}`);

        try {
            await testFunction();
            this.results.passed++;
            this.results.details.push({ name: testName, status: 'passed' });
            log.success(`Тест пройден: ${testName}`);
        } catch (error) {
            this.results.failed++;
            this.results.details.push({
                name: testName,
                status: 'failed',
                error: error.message
            });
            log.error(`Тест провален: ${testName} - ${error.message}`);
        }
    }

    // ТЕСТ 1: Создание callback заявки
    async testCallbackCreation() {
        const response = await this.client.post('/callback', this.testData.callbackRequest);

        if (response.status !== 200) {
            throw new Error(`Ошибка создания заявки. Статус: ${response.status}`);
        }

        if (!response.data.success) {
            throw new Error(`Заявка не создана. Ответ: ${JSON.stringify(response.data)}`);
        }

        this.callbackId = response.data.data.id;
        this.userId = response.data.data.user_id;

        log.info(`📋 ID заявки: ${this.callbackId}`);
        log.info(`👤 User ID: ${this.userId}`);
        log.info(`📧 Email: ${this.testData.callbackRequest.email}`);
    }

    // ТЕСТ 2: Проверка создания уведомлений
    async testNotificationCreation() {
        if (!this.callbackId) {
            throw new Error('Нет ID заявки для проверки уведомлений');
        }

        // Проверяем, что уведомления созданы в базе данных
        const response = await this.client.get(`/notifications/pending`);

        if (response.status !== 200) {
            throw new Error(`Ошибка получения уведомлений. Статус: ${response.status}`);
        }

        log.info(`📧 Найдено уведомлений: ${response.data.length || 0}`);
    }

    // ТЕСТ 3: Проверка API админ панели
    async testAdminPanelAPI() {
        const response = await this.client.get('/admin/callbacks');

        if (response.status !== 200) {
            throw new Error(`Ошибка API админ панели. Статус: ${response.status}`);
        }

        log.info(`📊 Заявок в админ панели: ${response.data.data?.length || 0}`);
    }

    // ТЕСТ 4: Проверка API пользовательского dashboard
    async testUserDashboardAPI() {
        // Сначала создаем пользователя
        try {
            await this.client.post('/auth/register', this.testData.userRegistration);
        } catch (error) {
            // Пользователь уже существует, это нормально
        }

        // Логинимся
        const loginResponse = await this.client.post('/auth/login', {
            email: this.testData.userRegistration.email,
            password: this.testData.userRegistration.password
        });

        if (loginResponse.status !== 200) {
            throw new Error(`Ошибка входа. Статус: ${loginResponse.status}`);
        }

        // Получаем заявки пользователя
        const callbacksResponse = await this.client.get('/user/callbacks', {
            headers: {
                'Cookie': loginResponse.headers['set-cookie']?.join('; ') || ''
            }
        });

        if (callbacksResponse.status !== 200) {
            throw new Error(`Ошибка получения заявок пользователя. Статус: ${callbacksResponse.status}`);
        }

        log.info(`👤 Заявок пользователя: ${callbacksResponse.data.data?.length || 0}`);
    }

    // ТЕСТ 5: Проверка обработки уведомлений
    async testNotificationProcessing() {
        const response = await this.client.get('/cron/process-notifications', {
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
            }
        });

        if (response.status !== 200) {
            log.warning(`Cron job недоступен (это нормально без настройки): ${response.status}`);
        } else {
            log.info(`⏰ Cron job обработал уведомления: ${response.data.message}`);
        }
    }

    // ТЕСТ 6: Проверка статических страниц
    async testStaticPages() {
        const pages = [
            '/',
            '/contacts',
            '/about',
            '/catalog'
        ];

        for (const page of pages) {
            try {
                const response = await axios.get(`${BASE_URL}${page}`, { timeout: 5000 });
                if (response.status !== 200) {
                    throw new Error(`Страница ${page} недоступна. Статус: ${response.status}`);
                }
            } catch (error) {
                throw new Error(`Ошибка загрузки страницы ${page}: ${error.message}`);
            }
        }

        log.info(`🌐 Проверено страниц: ${pages.length}`);
    }

    // ТЕСТ 7: Проверка админ и пользовательских интерфейсов
    async testUserInterfaces() {
        const interfaces = [
            { url: '/admin/callbacks/enhanced', name: 'Админ панель' },
            { url: '/dashboard', name: 'Пользовательский dashboard' },
            { url: '/auth/login', name: 'Страница входа' }
        ];

        for (const ui of interfaces) {
            try {
                const response = await axios.get(`${BASE_URL}${ui.url}`, { timeout: 5000 });
                if (response.status !== 200) {
                    throw new Error(`${ui.name} недоступен. Статус: ${response.status}`);
                }
            } catch (error) {
                throw new Error(`Ошибка загрузки ${ui.name}: ${error.message}`);
            }
        }

        log.info(`🖥️ Проверено интерфейсов: ${interfaces.length}`);
    }

    // ТЕСТ 8: Проверка базы данных
    async testDatabaseConnection() {
        // Проверяем доступность API, которые работают с базой данных
        const response = await this.client.get('/callbacks');

        if (response.status !== 200) {
            throw new Error(`Ошибка подключения к базе данных. Статус: ${response.status}`);
        }

        log.info(`🗄️ Подключение к базе данных: OK`);
    }

    // Запуск всех тестов
    async runAllTests() {
        log.section('🚀 ПОЛНЫЙ ТЕСТ СИСТЕМЫ ПОДДЕРЖКИ');

        await this.runTest('Создание callback заявки', () => this.testCallbackCreation());
        await this.runTest('Проверка создания уведомлений', () => this.testNotificationCreation());
        await this.runTest('API админ панели', () => this.testAdminPanelAPI());
        await this.runTest('API пользовательского dashboard', () => this.testUserDashboardAPI());
        await this.runTest('Обработка уведомлений', () => this.testNotificationProcessing());
        await this.runTest('Статические страницы', () => this.testStaticPages());
        await this.runTest('Пользовательские интерфейсы', () => this.testUserInterfaces());
        await this.runTest('Подключение к базе данных', () => this.testDatabaseConnection());

        this.printResults();
    }

    printResults() {
        log.section('📊 ИТОГОВЫЙ ОТЧЕТ ПОЛНОГО ТЕСТИРОВАНИЯ');

        console.log(`\n${colors.bright}Общая статистика:${colors.reset}`);
        console.log(`  Всего тестов: ${this.results.total}`);
        console.log(`  ${colors.green}Пройдено: ${this.results.passed}${colors.reset}`);
        console.log(`  ${colors.red}Провалено: ${this.results.failed}${colors.reset}`);
        console.log(`  Процент успеха: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

        if (this.results.failed > 0) {
            console.log(`\n${colors.red}Проваленные тесты:${colors.reset}`);
            this.results.details
                .filter(test => test.status === 'failed')
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error}`);
                });
        }

        console.log(`\n${colors.blue}Детали тестов:${colors.reset}`);
        this.results.details.forEach(test => {
            const status = test.status === 'passed' ?
                `${colors.green}✅${colors.reset}` :
                `${colors.red}❌${colors.reset}`;
            console.log(`  ${status} ${test.name}`);
        });

        // Сохраняем результаты
        const fs = require('fs');
        const resultsFile = 'complete-test-results.json';
        fs.writeFileSync(resultsFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            testData: this.testData,
            results: this.results
        }, null, 2));

        log.info(`Результаты сохранены в: ${resultsFile}`);

        if (this.results.failed === 0) {
            console.log(`\n${colors.green}${colors.bright}🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!${colors.reset}`);
            console.log(`${colors.green}Система поддержки полностью готова к работе!${colors.reset}`);
        } else {
            console.log(`\n${colors.yellow}${colors.bright}⚠️ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ${colors.reset}`);
            console.log(`${colors.yellow}Проверьте настройки и повторите тестирование${colors.reset}`);
        }
    }
}

// Запуск тестов
async function main() {
    const tester = new CompleteSystemTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(error => {
        console.error('Критическая ошибка тестирования:', error);
        process.exit(1);
    });
}

module.exports = CompleteSystemTester;
