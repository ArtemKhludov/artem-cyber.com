#!/usr/bin/env node

/**
 * Тестирование UI компонентов
 * Проверяет доступность и корректность отображения страниц
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    headless: process.env.HEADLESS !== 'false'
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

class UITester {
    constructor() {
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

    // HTTP клиент
    async fetchPage(url) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url, CONFIG.baseUrl);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; UITester/1.0)'
                }
            };

            const client = urlObj.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            req.end();
        });
    }

    // Тест 1: Проверка главной страницы
    async testHomePage() {
        const response = await this.fetchPage('/');

        if (response.status !== 200) {
            throw new Error(`Главная страница недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие ключевых элементов
        const requiredElements = [
            'EnergyLogic',
            'AI',
            'психолог',
            'курс',
            'заказать звонок'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует элемент: ${element}`);
            }
        }
    }

    // Тест 2: Проверка страницы каталога
    async testCatalogPage() {
        const response = await this.fetchPage('/catalog');

        if (response.status !== 200) {
            throw new Error(`Страница каталога недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие элементов каталога
        const requiredElements = [
            'каталог',
            'курс',
            'цена'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует элемент каталога: ${element}`);
            }
        }
    }

    // Тест 3: Проверка страницы контактов
    async testContactsPage() {
        const response = await this.fetchPage('/contacts');

        if (response.status !== 200) {
            throw new Error(`Страница контактов недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие контактной информации
        const requiredElements = [
            'контакт',
            'телефон',
            'email'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует контактная информация: ${element}`);
            }
        }
    }

    // Тест 4: Проверка страницы входа
    async testLoginPage() {
        const response = await this.fetchPage('/auth/login');

        if (response.status !== 200) {
            throw new Error(`Страница входа недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие формы входа
        const requiredElements = [
            'войти',
            'email',
            'пароль',
            'Google'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует элемент формы входа: ${element}`);
            }
        }
    }

    // Тест 5: Проверка страницы регистрации
    async testSignupPage() {
        const response = await this.fetchPage('/auth/signup');

        if (response.status !== 200) {
            throw new Error(`Страница регистрации недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие формы регистрации
        const requiredElements = [
            'регистрация',
            'email',
            'пароль',
            'Google'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует элемент формы регистрации: ${element}`);
            }
        }
    }

    // Тест 6: Проверка страницы о нас
    async testAboutPage() {
        const response = await this.fetchPage('/about');

        if (response.status !== 200) {
            throw new Error(`Страница о нас недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие информации о компании
        const requiredElements = [
            'о нас',
            'команда',
            'миссия'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует информация о компании: ${element}`);
            }
        }
    }

    // Тест 7: Проверка страницы отзывов
    async testReviewsPage() {
        const response = await this.fetchPage('/reviews');

        if (response.status !== 200) {
            throw new Error(`Страница отзывов недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие отзывов
        const requiredElements = [
            'отзыв',
            'клиент',
            'рейтинг'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует элемент отзывов: ${element}`);
            }
        }
    }

    // Тест 8: Проверка страницы чекаута
    async testCheckoutPage() {
        const response = await this.fetchPage('/checkout');

        if (response.status !== 200) {
            throw new Error(`Страница чекаута недоступна. Статус: ${response.status}`);
        }

        // Проверяем наличие формы оплаты
        const requiredElements = [
            'оплата',
            'карта',
            'Stripe',
            'Cryptomus'
        ];

        for (const element of requiredElements) {
            if (!response.body.includes(element)) {
                throw new Error(`Отсутствует элемент формы оплаты: ${element}`);
            }
        }
    }

    // Тест 9: Проверка страницы личного кабинета (должна перенаправлять)
    async testDashboardPage() {
        const response = await this.fetchPage('/dashboard');

        if (response.status !== 200 && response.status !== 302) {
            throw new Error(`Страница личного кабинета недоступна. Статус: ${response.status}`);
        }
    }

    // Тест 10: Проверка страницы админки (должна перенаправлять)
    async testAdminPage() {
        const response = await this.fetchPage('/admin');

        if (response.status !== 200 && response.status !== 302) {
            throw new Error(`Страница админки недоступна. Статус: ${response.status}`);
        }
    }

    // Тест 11: Проверка модальных окон (через JavaScript)
    async testModalWindows() {
        // Этот тест требует браузерного окружения
        // Пока что просто проверяем, что страницы загружаются
        const pages = ['/', '/catalog', '/contacts'];

        for (const page of pages) {
            const response = await this.fetchPage(page);

            if (response.status !== 200) {
                throw new Error(`Страница ${page} недоступна для проверки модальных окон`);
            }

            // Проверяем наличие кнопок, которые должны открывать модальные окна
            const modalTriggers = [
                'заказать звонок',
                'обратная связь',
                'связаться'
            ];

            let foundTrigger = false;
            for (const trigger of modalTriggers) {
                if (response.body.includes(trigger)) {
                    foundTrigger = true;
                    break;
                }
            }

            if (!foundTrigger) {
                throw new Error(`На странице ${page} не найдены триггеры модальных окон`);
            }
        }
    }

    // Тест 12: Проверка адаптивности (базовая)
    async testResponsiveDesign() {
        const pages = ['/', '/catalog', '/contacts'];

        for (const page of pages) {
            // Проверяем с разными User-Agent
            const userAgents = [
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                'Mozilla/5.0 (Android 10; Mobile; rv:68.0)',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            ];

            for (const userAgent of userAgents) {
                const response = await this.fetchPageWithUserAgent(page, userAgent);

                if (response.status !== 200) {
                    throw new Error(`Страница ${page} недоступна для ${userAgent}`);
                }
            }
        }
    }

    async fetchPageWithUserAgent(url, userAgent) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url, CONFIG.baseUrl);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': userAgent
                }
            };

            const client = urlObj.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            req.end();
        });
    }

    // Запуск всех тестов
    async runAllTests() {
        log.section('🖥️ ТЕСТИРОВАНИЕ UI КОМПОНЕНТОВ');

        await this.runTest('Главная страница', () => this.testHomePage());
        await this.runTest('Страница каталога', () => this.testCatalogPage());
        await this.runTest('Страница контактов', () => this.testContactsPage());
        await this.runTest('Страница входа', () => this.testLoginPage());
        await this.runTest('Страница регистрации', () => this.testSignupPage());
        await this.runTest('Страница о нас', () => this.testAboutPage());
        await this.runTest('Страница отзывов', () => this.testReviewsPage());
        await this.runTest('Страница чекаута', () => this.testCheckoutPage());
        await this.runTest('Страница личного кабинета', () => this.testDashboardPage());
        await this.runTest('Страница админки', () => this.testAdminPage());
        await this.runTest('Модальные окна', () => this.testModalWindows());
        await this.runTest('Адаптивный дизайн', () => this.testResponsiveDesign());

        this.printResults();
    }

    printResults() {
        log.section('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ UI');

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
        const reportPath = path.join(__dirname, '..', 'test-ui-results.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            config: CONFIG,
            results: this.results
        }, null, 2));

        log.info(`Результаты сохранены в: ${reportPath}`);

        if (this.results.failed === 0) {
            log.success('🎉 ВСЕ UI ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
            process.exit(0);
        } else {
            log.error('❌ НЕКОТОРЫЕ UI ТЕСТЫ ПРОВАЛЕНЫ!');
            process.exit(1);
        }
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new UITester();
    tester.runAllTests().catch(error => {
        log.error(`Критическая ошибка: ${error.message}`);
        process.exit(1);
    });
}

module.exports = UITester;
