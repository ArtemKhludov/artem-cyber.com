#!/usr/bin/env node

/**
 * Комплексная система тестирования EnergyLogic
 * Проверяет все компоненты системы обратной связи
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    adminEmail: process.env.TEST_ADMIN_EMAIL || 'admin@energylogic-ai.com',
    testUserEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
    testUserPhone: process.env.TEST_USER_PHONE || '+1234567890',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

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

// Утилиты
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}`)
};

// HTTP клиент
class HttpClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async request(method, path, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const client = url.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsedBody = body ? JSON.parse(body) : {};
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: parsedBody
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: body
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async get(path, headers = {}) {
        return this.request('GET', path, null, headers);
    }

    async post(path, data, headers = {}) {
        return this.request('POST', path, data, headers);
    }

    async put(path, data, headers = {}) {
        return this.request('PUT', path, data, headers);
    }

    async delete(path, headers = {}) {
        return this.request('DELETE', path, null, headers);
    }
}

// Генерируем уникальные тестовые данные
const generateTestData = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const email = `test-${timestamp}-${random}@example.com`;
    const phone = `+123456789${random % 10}`;

    return {
        callbackRequest: {
            name: 'Тестовый Пользователь',
            phone: phone,
            email: email,
            message: 'Тестовое сообщение для проверки системы',
            preferred_time: 'Утром',
            source_page: '/test',
            product_type: 'test_request'
        },
        userRegistration: {
            name: 'Тестовый Пользователь',
            email: email,
            password: 'TestPassword123!',
            phone: phone
        }
    };
};

const testData = generateTestData();

// Основной класс тестирования
class SystemTester {
    constructor() {
        this.client = new HttpClient(CONFIG.baseUrl);
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
    }

    async runTest(name, testFn) {
        this.results.total++;
        log.test(`Запуск теста: ${name}`);

        try {
            await testFn();
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASSED' });
            log.success(`Тест пройден: ${name}`);
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAILED', error: error.message });
            log.error(`Тест провален: ${name} - ${error.message}`);
        }
    }

    // Тест 1: Проверка доступности API
    async testApiAvailability() {
        const response = await this.client.get('/api/health');
        if (response.status !== 200 && response.status !== 404) {
            throw new Error(`API недоступен. Статус: ${response.status}`);
        }
    }

    // Тест 2: Проверка создания заявки через API
    async testCallbackCreation() {
        // Сначала создаем пользователя, если его нет
        try {
            await this.client.post('/api/auth/register', testData.userRegistration);
        } catch (error) {
            // Пользователь уже существует, это нормально
        }

        const response = await this.client.post('/api/callback', testData.callbackRequest);

        if (response.status !== 200) {
            throw new Error(`Ошибка создания заявки. Статус: ${response.status}, Ответ: ${JSON.stringify(response.data)}`);
        }

        if (!response.data.success) {
            throw new Error(`Заявка не создана. Ответ: ${JSON.stringify(response.data)}`);
        }

        return response.data.data;
    }

    // Тест 3: Проверка создания заявки через расширенный API
    async testEnhancedCallbackCreation() {
        // Сначала создаем пользователя, если его нет
        try {
            await this.client.post('/api/auth/register', testData.userRegistration);
        } catch (error) {
            // Пользователь уже существует, это нормально
        }

        const response = await this.client.post('/api/callback/enhanced', {
            ...testData.callbackRequest,
            priority: 'medium',
            tags: ['test', 'automation']
        });

        if (response.status !== 200) {
            throw new Error(`Ошибка создания расширенной заявки. Статус: ${response.status}`);
        }

        if (!response.data.success) {
            throw new Error(`Расширенная заявка не создана. Ответ: ${JSON.stringify(response.data)}`);
        }

        return response.data.data;
    }

    // Тест 4: Проверка получения заявок
    async testGetCallbacks() {
        const response = await this.client.get('/api/callbacks');

        if (response.status !== 200) {
            throw new Error(`Ошибка получения заявок. Статус: ${response.status}`);
        }

        if (!response.data.data || !Array.isArray(response.data.data)) {
            throw new Error(`Некорректный формат ответа. Ожидается объект с массивом data, получен: ${typeof response.data}`);
        }

        if (!response.data.pagination) {
            throw new Error(`Отсутствует информация о пагинации`);
        }
    }

    // Тест 5: Проверка регистрации пользователя
    async testUserRegistration() {
        const response = await this.client.post('/api/auth/register', testData.userRegistration);

        if (response.status !== 200 && response.status !== 201) {
            throw new Error(`Ошибка регистрации пользователя. Статус: ${response.status}, Ответ: ${JSON.stringify(response.data)}`);
        }
    }

    // Тест 6: Проверка аутентификации
    async testUserAuthentication() {
        const loginData = {
            email: testData.userRegistration.email,
            password: testData.userRegistration.password
        };

        const response = await this.client.post('/api/auth/login', loginData, {
            'Origin': 'http://localhost:3000',
            'Referer': 'http://localhost:3000/auth/login'
        });

        if (response.status !== 200) {
            throw new Error(`Ошибка аутентификации. Статус: ${response.status}, Ответ: ${JSON.stringify(response.data)}`);
        }

        if (!response.data.success) {
            throw new Error(`Аутентификация не удалась. Ответ: ${JSON.stringify(response.data)}`);
        }

        return response.data.token;
    }

    // Тест 7: Проверка получения данных пользователя
    async testGetUserData(token) {
        const response = await this.client.get('/api/auth/me', {
            'Authorization': `Bearer ${token}`
        });

        if (response.status !== 200) {
            throw new Error(`Ошибка получения данных пользователя. Статус: ${response.status}`);
        }

        if (!response.data.user) {
            throw new Error(`Данные пользователя не получены. Ответ: ${JSON.stringify(response.data)}`);
        }
    }

    // Тест 8: Проверка создания заявки от пользователя
    async testUserCallbackCreation(token) {
        const response = await this.client.post('/api/user/callbacks', {
            message: 'Тестовая заявка от пользователя',
            priority: 'high'
        }, {
            'Authorization': `Bearer ${token}`
        });

        if (response.status !== 200) {
            throw new Error(`Ошибка создания заявки от пользователя. Статус: ${response.status}`);
        }

        if (!response.data.success) {
            throw new Error(`Заявка от пользователя не создана. Ответ: ${JSON.stringify(response.data)}`);
        }

        return response.data.data;
    }

    // Тест 9: Проверка получения заявок пользователя
    async testGetUserCallbacks(token) {
        const response = await this.client.get('/api/user/callbacks', {
            'Authorization': `Bearer ${token}`
        });

        if (response.status !== 200) {
            throw new Error(`Ошибка получения заявок пользователя. Статус: ${response.status}`);
        }

        if (!Array.isArray(response.data)) {
            throw new Error(`Некорректный формат заявок пользователя. Ожидается массив, получен: ${typeof response.data}`);
        }
    }

    // Тест 10: Проверка Telegram интеграции
    async testTelegramIntegration() {
        if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
            log.warning('Telegram токены не настроены, пропускаем тест');
            return;
        }

        // Проверяем, что бот отвечает
        const botUrl = `https://api.telegram.org/bot${CONFIG.telegramBotToken}/getMe`;
        const response = await this.client.get(botUrl);

        if (response.status !== 200) {
            throw new Error(`Telegram бот недоступен. Статус: ${response.status}`);
        }

        if (!response.data.ok) {
            throw new Error(`Telegram бот не работает. Ответ: ${JSON.stringify(response.data)}`);
        }
    }

    // Тест 11: Проверка базы данных
    async testDatabaseConnection() {
        if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
            log.warning('Supabase конфигурация не настроена, пропускаем тест');
            return;
        }

        // Проверяем доступность Supabase
        const response = await this.client.get(`${CONFIG.supabaseUrl}/rest/v1/`, {
            'apikey': CONFIG.supabaseAnonKey
        });

        if (response.status !== 200) {
            throw new Error(`Supabase недоступен. Статус: ${response.status}`);
        }
    }

    // Тест 12: Проверка статических страниц
    async testStaticPages() {
        const pages = ['/', '/about', '/catalog', '/contacts', '/auth/login', '/auth/signup'];

        for (const page of pages) {
            const response = await this.client.get(page);

            if (response.status !== 200) {
                throw new Error(`Страница ${page} недоступна. Статус: ${response.status}`);
            }
        }
    }

    // Тест 13: Проверка админ панели
    async testAdminPanel() {
        const response = await this.client.get('/admin');

        if (response.status !== 200) {
            throw new Error(`Админ панель недоступна. Статус: ${response.status}`);
        }
    }

    // Тест 14: Проверка личного кабинета
    async testDashboard() {
        const response = await this.client.get('/dashboard');

        if (response.status !== 200 && response.status !== 302) {
            throw new Error(`Личный кабинет недоступен. Статус: ${response.status}`);
        }
    }

    // Запуск всех тестов
    async runAllTests() {
        log.section('🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ');

        // Проверка конфигурации
        log.info('Проверка конфигурации...');
        if (!CONFIG.baseUrl) {
            throw new Error('Не указан базовый URL для тестирования');
        }
        log.success('Конфигурация корректна');

        // Базовые тесты
        await this.runTest('Доступность API', () => this.testApiAvailability());
        await this.runTest('Telegram интеграция', () => this.testTelegramIntegration());
        await this.runTest('Подключение к базе данных', () => this.testDatabaseConnection());

        // Тесты статических страниц
        await this.runTest('Статические страницы', () => this.testStaticPages());
        await this.runTest('Админ панель', () => this.testAdminPanel());
        await this.runTest('Личный кабинет', () => this.testDashboard());

        // Тесты API
        await this.runTest('Создание заявки', () => this.testCallbackCreation());
        await this.runTest('Создание расширенной заявки', () => this.testEnhancedCallbackCreation());
        await this.runTest('Получение заявок', () => this.testGetCallbacks());

        // Тесты пользователей
        await this.runTest('Регистрация пользователя', () => this.testUserRegistration());

        // Тесты с аутентификацией
        let token;
        try {
            token = await this.testUserAuthentication();
            await this.runTest('Аутентификация пользователя', () => Promise.resolve());
            await this.runTest('Получение данных пользователя', () => this.testGetUserData(token));
            await this.runTest('Создание заявки от пользователя', () => this.testUserCallbackCreation(token));
            await this.runTest('Получение заявок пользователя', () => this.testGetUserCallbacks(token));
        } catch (error) {
            await this.runTest('Аутентификация пользователя', () => { throw error; });
        }

        // Результаты
        this.printResults();
    }

    printResults() {
        log.section('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');

        console.log(`\n${colors.bright}Общая статистика:${colors.reset}`);
        console.log(`  Всего тестов: ${this.results.total}`);
        console.log(`  ${colors.green}Пройдено: ${this.results.passed}${colors.reset}`);
        console.log(`  ${colors.red}Провалено: ${this.results.failed}${colors.reset}`);
        console.log(`  Процент успеха: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

        if (this.results.failed > 0) {
            console.log(`\n${colors.red}Проваленные тесты:${colors.reset}`);
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error}`);
                });
        }

        console.log(`\n${colors.bright}Детальные результаты:${colors.reset}`);
        this.results.tests.forEach(test => {
            const status = test.status === 'PASSED' ?
                `${colors.green}✓${colors.reset}` :
                `${colors.red}✗${colors.reset}`;
            console.log(`  ${status} ${test.name}`);
        });

        // Сохранение результатов
        const reportPath = path.join(__dirname, '..', 'test-results.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            config: CONFIG,
            results: this.results
        }, null, 2));

        log.info(`Результаты сохранены в: ${reportPath}`);

        if (this.results.failed === 0) {
            log.success('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
            process.exit(0);
        } else {
            log.error('❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ!');
            process.exit(1);
        }
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new SystemTester();
    tester.runAllTests().catch(error => {
        log.error(`Критическая ошибка: ${error.message}`);
        process.exit(1);
    });
}

module.exports = SystemTester;
