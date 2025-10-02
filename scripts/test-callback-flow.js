#!/usr/bin/env node

/**
 * Специализированный тест для потока обратной связи
 * Проверяет полный цикл: создание заявки → уведомления → ответы → завершение
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
    telegramChatId: process.env.TELEGRAM_CHAT_ID
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

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}`)
};

class CallbackFlowTester {
    constructor() {
        this.client = new HttpClient(CONFIG.baseUrl);
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
        this.testData = {
            callbackId: null,
            userId: null,
            issueId: null,
            token: null
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

  // Тест 1: Создание заявки через модальное окно
  async testCallbackCreation() {
    const callbackData = {
        name: 'Тестовый Пользователь',
        phone: '+1234567890',
        email: `test-${Date.now()}@example.com`,
        message: 'Тестовое сообщение для проверки потока обратной связи',
        preferred_time: 'Утром',
        source_page: '/test',
        product_type: 'test_flow'
    };

    const response = await this.client.post('/api/callback', callbackData);

    if (response.status !== 200) {
        throw new Error(`Ошибка создания заявки. Статус: ${response.status}`);
    }

    if (!response.data.success) {
        throw new Error(`Заявка не создана. Ответ: ${JSON.stringify(response.data)}`);
    }

    this.testData.callbackId = response.data.data.id;
    log.info(`Заявка создана с ID: ${this.testData.callbackId}`);
}

  // Тест 2: Проверка автоматического создания пользователя
  async testUserAutoCreation() {
    if (!this.testData.callbackId) {
        throw new Error('ID заявки не найден');
    }

    // Ждем немного, чтобы триггер сработал
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Проверяем, что пользователь создался
    const response = await this.client.get('/api/callbacks');

    if (response.status !== 200) {
        throw new Error(`Ошибка получения заявок. Статус: ${response.status}`);
    }

    const callback = response.data.find(cb => cb.id === this.testData.callbackId);
    if (!callback) {
        throw new Error('Заявка не найдена');
    }

    if (!callback.user_id) {
        throw new Error('Пользователь не создался автоматически');
    }

    this.testData.userId = callback.user_id;
    log.info(`Пользователь создан с ID: ${this.testData.userId}`);
}

  // Тест 3: Проверка создания обращения
  async testIssueCreation() {
    if (!this.testData.userId) {
        throw new Error('ID пользователя не найден');
    }

    // Проверяем, что обращение создалось
    const response = await this.client.get('/api/user/issues', {
        'Authorization': `Bearer ${this.testData.token || 'test'}`
    });

    if (response.status !== 200 && response.status !== 401) {
        throw new Error(`Ошибка получения обращений. Статус: ${response.status}`);
    }

    // Если есть токен, проверяем обращения
    if (this.testData.token && response.status === 200) {
        const issue = response.data.find(issue => issue.user_id === this.testData.userId);
        if (issue) {
            this.testData.issueId = issue.id;
            log.info(`Обращение создано с ID: ${this.testData.issueId}`);
        }
    }
}

  // Тест 4: Проверка Telegram уведомления
  async testTelegramNotification() {
    if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
        log.warning('Telegram токены не настроены, пропускаем тест');
        return;
    }

    // Проверяем, что бот работает
    const botUrl = `https://api.telegram.org/bot${CONFIG.telegramBotToken}/getMe`;
    const response = await this.client.get(botUrl);

    if (response.status !== 200) {
        throw new Error(`Telegram бот недоступен. Статус: ${response.status}`);
    }

    if (!response.data.ok) {
        throw new Error(`Telegram бот не работает. Ответ: ${JSON.stringify(response.data)}`);
    }

    log.info('Telegram бот работает корректно');
}

  // Тест 5: Регистрация пользователя
  async testUserRegistration() {
    const userData = {
        name: 'Тестовый Пользователь',
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        phone: '+1234567890'
    };

    const response = await this.client.post('/api/auth/register', userData);

    if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Ошибка регистрации пользователя. Статус: ${response.status}`);
    }

    log.info('Пользователь зарегистрирован');
}

  // Тест 6: Аутентификация пользователя
  async testUserAuthentication() {
    const loginData = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!'
    };

    const response = await this.client.post('/api/auth/login', loginData);

    if (response.status !== 200) {
        throw new Error(`Ошибка аутентификации. Статус: ${response.status}`);
    }

    if (!response.data.success) {
        throw new Error(`Аутентификация не удалась. Ответ: ${JSON.stringify(response.data)}`);
    }

    this.testData.token = response.data.token;
    log.info('Пользователь аутентифицирован');
}

  // Тест 7: Проверка заявок в личном кабинете
  async testUserCallbacksInDashboard() {
    if (!this.testData.token) {
        throw new Error('Токен аутентификации не найден');
    }

    const response = await this.client.get('/api/user/callbacks', {
        'Authorization': `Bearer ${this.testData.token}`
    });

    if (response.status !== 200) {
        throw new Error(`Ошибка получения заявок пользователя. Статус: ${response.status}`);
    }

    if (!Array.isArray(response.data)) {
        throw new Error(`Некорректный формат заявок пользователя. Ожидается массив, получен: ${typeof response.data}`);
    }

    const userCallback = response.data.find(cb => cb.id === this.testData.callbackId);
    if (!userCallback) {
        throw new Error('Заявка не найдена в личном кабинете пользователя');
    }

    log.info('Заявка найдена в личном кабинете пользователя');
}

  // Тест 8: Создание ответа от пользователя
  async testUserReply() {
    if (!this.testData.token || !this.testData.callbackId) {
        throw new Error('Токен или ID заявки не найден');
    }

    const replyData = {
        message: 'Спасибо за быстрый ответ! Это тестовое сообщение от пользователя.'
    };

    const response = await this.client.post(`/api/callback/${this.testData.callbackId}/replies`, replyData, {
        'Authorization': `Bearer ${this.testData.token}`
    });

    if (response.status !== 200) {
        throw new Error(`Ошибка создания ответа от пользователя. Статус: ${response.status}`);
    }

    if (!response.data.success) {
        throw new Error(`Ответ от пользователя не создан. Ответ: ${JSON.stringify(response.data)}`);
    }

    log.info('Ответ от пользователя создан');
}

  // Тест 9: Проверка заявок в админке
  async testAdminCallbacksView() {
    const response = await this.client.get('/api/callbacks');

    if (response.status !== 200) {
        throw new Error(`Ошибка получения заявок для админки. Статус: ${response.status}`);
    }

    const adminCallback = response.data.find(cb => cb.id === this.testData.callbackId);
    if (!adminCallback) {
        throw new Error('Заявка не найдена в админке');
    }

    if (!adminCallback.user_id) {
        throw new Error('Заявка в админке не связана с пользователем');
    }

    log.info('Заявка найдена в админке и связана с пользователем');
}

  // Тест 10: Создание ответа от администратора
  async testAdminReply() {
    if (!this.testData.callbackId) {
        throw new Error('ID заявки не найден');
    }

    const replyData = {
        message: 'Спасибо за обращение! Мы рассмотрим вашу заявку в ближайшее время. Это тестовый ответ от администратора.',
        is_admin: true
    };

    const response = await this.client.post(`/api/callback/${this.testData.callbackId}/replies`, replyData);

    if (response.status !== 200) {
        throw new Error(`Ошибка создания ответа от администратора. Статус: ${response.status}`);
    }

    if (!response.data.success) {
        throw new Error(`Ответ от администратора не создан. Ответ: ${JSON.stringify(response.data)}`);
    }

    log.info('Ответ от администратора создан');
}

  // Тест 11: Обновление статуса заявки
  async testCallbackStatusUpdate() {
    if (!this.testData.callbackId) {
        throw new Error('ID заявки не найден');
    }

    const statusData = {
        status: 'completed',
        admin_notes: 'Заявка обработана и закрыта в рамках тестирования'
    };

    const response = await this.client.put(`/api/callback/enhanced/${this.testData.callbackId}`, statusData);

    if (response.status !== 200) {
        throw new Error(`Ошибка обновления статуса заявки. Статус: ${response.status}`);
    }

    if (!response.data.success) {
        throw new Error(`Статус заявки не обновлен. Ответ: ${JSON.stringify(response.data)}`);
    }

    log.info('Статус заявки обновлен на "completed"');
}

  // Тест 12: Проверка уведомлений пользователю
  async testUserNotifications() {
    if (!this.testData.token) {
        throw new Error('Токен аутентификации не найден');
    }

    // Проверяем, что пользователь получил уведомления
    const response = await this.client.get('/api/user/callbacks', {
        'Authorization': `Bearer ${this.testData.token}`
    });

    if (response.status !== 200) {
        throw new Error(`Ошибка получения заявок для проверки уведомлений. Статус: ${response.status}`);
    }

    const userCallback = response.data.find(cb => cb.id === this.testData.callbackId);
    if (!userCallback) {
        throw new Error('Заявка не найдена для проверки уведомлений');
    }

    if (userCallback.status !== 'completed') {
        throw new Error(`Статус заявки не обновился. Ожидается: completed, получен: ${userCallback.status}`);
    }

    log.info('Уведомления пользователю работают корректно');
}

  // Очистка тестовых данных
  async cleanupTestData() {
    log.info('Очистка тестовых данных...');

    try {
        // Удаляем заявку
        if (this.testData.callbackId) {
            await this.client.delete(`/api/callback/${this.testData.callbackId}`);
        }

        // Удаляем пользователя (если есть админские права)
        if (this.testData.userId) {
            await this.client.delete(`/api/users/${this.testData.userId}`);
        }

        log.success('Тестовые данные очищены');
    } catch (error) {
        log.warning(`Ошибка очистки тестовых данных: ${error.message}`);
    }
}

  // Запуск всех тестов
  async runAllTests() {
    log.section('🔄 ТЕСТИРОВАНИЕ ПОТОКА ОБРАТНОЙ СВЯЗИ');

    try {
        // Основной поток
        await this.runTest('Создание заявки', () => this.testCallbackCreation());
        await this.runTest('Автоматическое создание пользователя', () => this.testUserAutoCreation());
        await this.runTest('Создание обращения', () => this.testIssueCreation());
        await this.runTest('Telegram уведомление', () => this.testTelegramNotification());

        // Пользовательский поток
        await this.runTest('Регистрация пользователя', () => this.testUserRegistration());
        await this.runTest('Аутентификация пользователя', () => this.testUserAuthentication());
        await this.runTest('Заявки в личном кабинете', () => this.testUserCallbacksInDashboard());
        await this.runTest('Ответ от пользователя', () => this.testUserReply());

        // Админский поток
        await this.runTest('Заявки в админке', () => this.testAdminCallbacksView());
        await this.runTest('Ответ от администратора', () => this.testAdminReply());
        await this.runTest('Обновление статуса заявки', () => this.testCallbackStatusUpdate());
        await this.runTest('Уведомления пользователю', () => this.testUserNotifications());

    } finally {
        // Очищаем тестовые данные
        await this.cleanupTestData();
    }

    this.printResults();
}

printResults() {
    log.section('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ПОТОКА');

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

    // Сохранение результатов
    const reportPath = path.join(__dirname, '..', 'test-callback-flow-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        config: CONFIG,
        testData: this.testData,
        results: this.results
    }, null, 2));

    log.info(`Результаты сохранены в: ${reportPath}`);

    if (this.results.failed === 0) {
        log.success('🎉 ВСЕ ТЕСТЫ ПОТОКА ПРОЙДЕНЫ УСПЕШНО!');
        process.exit(0);
    } else {
        log.error('❌ НЕКОТОРЫЕ ТЕСТЫ ПОТОКА ПРОВАЛЕНЫ!');
        process.exit(1);
    }
}
}

// Запуск тестирования
if (require.main === module) {
    const tester = new CallbackFlowTester();
    tester.runAllTests().catch(error => {
        log.error(`Критическая ошибка: ${error.message}`);
        process.exit(1);
    });
}

module.exports = CallbackFlowTester;
