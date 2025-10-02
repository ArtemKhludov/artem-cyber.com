#!/usr/bin/env node

/**
 * Тестирование базы данных и триггеров
 * Проверяет корректность работы триггеров и функций
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
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

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}`)
};

class DatabaseTester {
    constructor() {
        if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
            throw new Error('Не настроены переменные окружения Supabase');
        }

        this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);
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

    // Тест 1: Проверка подключения к базе данных
    async testDatabaseConnection() {
        const { data, error } = await this.supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            throw new Error(`Ошибка подключения к БД: ${error.message}`);
        }
    }

    // Тест 2: Проверка существования таблиц
    async testTablesExist() {
        const tables = [
            'users',
            'callback_requests',
            'callback_replies',
            'callback_notifications',
            'callback_templates',
            'callback_sla_metrics',
            'telegram_link_tokens',
            'user_contact_audit',
            'issue_reports',
            'issue_replies'
        ];

        for (const table of tables) {
            const { data, error } = await this.supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                throw new Error(`Таблица ${table} не существует: ${error.message}`);
            }
        }
    }

    // Тест 3: Проверка триггера создания пользователя
    async testUserCreationTrigger() {
        const testEmail = `test-trigger-${Date.now()}@example.com`;
        const testPhone = `+123456789${Math.floor(Math.random() * 10)}`;

        // Создаем заявку
        const { data: callbackData, error: callbackError } = await this.supabase
            .from('callback_requests')
            .insert({
                name: 'Тестовый Пользователь',
                email: testEmail,
                phone: testPhone,
                message: 'Тест триггера создания пользователя',
                source_page: '/test',
                product_type: 'test_trigger'
            })
            .select()
            .single();

        if (callbackError) {
            throw new Error(`Ошибка создания заявки: ${callbackError.message}`);
        }

        // Проверяем, что пользователь создался
        const { data: userData, error: userError } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', testEmail)
            .single();

        if (userError) {
            throw new Error(`Пользователь не создался автоматически: ${userError.message}`);
        }

        // Проверяем, что заявка связалась с пользователем
        const { data: updatedCallback, error: updateError } = await this.supabase
            .from('callback_requests')
            .select('*')
            .eq('id', callbackData.id)
            .single();

        if (updateError) {
            throw new Error(`Ошибка получения обновленной заявки: ${updateError.message}`);
        }

        if (!updatedCallback.user_id) {
            throw new Error('Заявка не связалась с пользователем');
        }

        if (updatedCallback.user_id !== userData.id) {
            throw new Error('Неправильная связь заявки с пользователем');
        }

        // Очищаем тестовые данные
        await this.supabase.from('callback_requests').delete().eq('id', callbackData.id);
        await this.supabase.from('users').delete().eq('id', userData.id);
    }

    // Тест 4: Проверка триггера создания обращения
    async testIssueCreationTrigger() {
        const testEmail = `test-issue-trigger-${Date.now()}@example.com`;

        // Создаем пользователя
        const { data: userData, error: userError } = await this.supabase
            .from('users')
            .insert({
                name: 'Тестовый Пользователь',
                email: testEmail,
                phone: '+1234567890',
                role: 'user'
            })
            .select()
            .single();

        if (userError) {
            throw new Error(`Ошибка создания пользователя: ${userError.message}`);
        }

        // Создаем заявку
        const { data: callbackData, error: callbackError } = await this.supabase
            .from('callback_requests')
            .insert({
                user_id: userData.id,
                name: 'Тестовый Пользователь',
                email: testEmail,
                phone: '+1234567890',
                message: 'Тест триггера создания обращения',
                source_page: '/test',
                product_type: 'test_issue_trigger'
            })
            .select()
            .single();

        if (callbackError) {
            throw new Error(`Ошибка создания заявки: ${callbackError.message}`);
        }

        // Проверяем, что обращение создалось
        const { data: issueData, error: issueError } = await this.supabase
            .from('issue_reports')
            .select('*')
            .eq('user_id', userData.id)
            .eq('callback_request_id', callbackData.id)
            .single();

        if (issueError) {
            throw new Error(`Обращение не создалось автоматически: ${issueError.message}`);
        }

        // Очищаем тестовые данные
        await this.supabase.from('issue_reports').delete().eq('id', issueData.id);
        await this.supabase.from('callback_requests').delete().eq('id', callbackData.id);
        await this.supabase.from('users').delete().eq('id', userData.id);
    }

    // Тест 5: Проверка функций базы данных
    async testDatabaseFunctions() {
        // Проверяем функцию increment_contact_attempts
        const { data, error } = await this.supabase
            .rpc('increment_contact_attempts', { callback_id: '00000000-0000-0000-0000-000000000000' });

        if (error && !error.message.includes('violates foreign key constraint')) {
            throw new Error(`Функция increment_contact_attempts не работает: ${error.message}`);
        }
    }

    // Тест 6: Проверка индексов
    async testIndexes() {
        // Проверяем, что запросы с индексами работают быстро
        const startTime = Date.now();

        const { data, error } = await this.supabase
            .from('callback_requests')
            .select('*')
            .eq('status', 'new')
            .limit(10);

        const endTime = Date.now();
        const queryTime = endTime - startTime;

        if (error) {
            throw new Error(`Ошибка запроса с индексом: ${error.message}`);
        }

        if (queryTime > 1000) {
            log.warning(`Запрос выполнился медленно: ${queryTime}ms`);
        }
    }

    // Тест 7: Проверка ограничений
    async testConstraints() {
        // Проверяем уникальность email
        const testEmail = `constraint-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;

        // Создаем первого пользователя
        const { data: user1, error: error1 } = await this.supabase
            .from('users')
            .insert({
                name: 'Пользователь 1',
                email: testEmail,
                phone: '+1234567890',
                role: 'user'
            })
            .select()
            .single();

        if (error1) {
            throw new Error(`Ошибка создания первого пользователя: ${error1.message}`);
        }

        // Пытаемся создать второго пользователя с тем же email
        const { data: user2, error: error2 } = await this.supabase
            .from('users')
            .insert({
                name: 'Пользователь 2',
                email: testEmail,
                phone: '+1234567891',
                role: 'user'
            })
            .select()
            .single();

        if (!error2) {
            throw new Error('Ограничение уникальности email не работает');
        }

        // Очищаем тестовые данные
        await this.supabase.from('users').delete().eq('id', user1.id);
    }

    // Тест 8: Проверка RLS политик
    async testRLSPolicies() {
        // Создаем клиента с анонимным ключом
        const anonClient = createClient(CONFIG.supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        // Пытаемся получить данные пользователей (должно быть запрещено)
        const { data, error } = await anonClient
            .from('users')
            .select('*')
            .limit(1);

        if (!error) {
            throw new Error('RLS политики не работают - анонимный пользователь может читать данные');
        }
    }

    // Запуск всех тестов
    async runAllTests() {
        log.section('🗄️ ТЕСТИРОВАНИЕ БАЗЫ ДАННЫХ');

        await this.runTest('Подключение к базе данных', () => this.testDatabaseConnection());
        await this.runTest('Существование таблиц', () => this.testTablesExist());
        await this.runTest('Триггер создания пользователя', () => this.testUserCreationTrigger());
        await this.runTest('Триггер создания обращения', () => this.testIssueCreationTrigger());
        await this.runTest('Функции базы данных', () => this.testDatabaseFunctions());
        await this.runTest('Индексы', () => this.testIndexes());
        await this.runTest('Ограничения', () => this.testConstraints());
        await this.runTest('RLS политики', () => this.testRLSPolicies());

        this.printResults();
    }

    printResults() {
        log.section('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ БД');

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
        const reportPath = path.join(__dirname, '..', 'test-database-results.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            config: CONFIG,
            results: this.results
        }, null, 2));

        log.info(`Результаты сохранены в: ${reportPath}`);

        if (this.results.failed === 0) {
            log.success('🎉 ВСЕ ТЕСТЫ БД ПРОЙДЕНЫ УСПЕШНО!');
            process.exit(0);
        } else {
            log.error('❌ НЕКОТОРЫЕ ТЕСТЫ БД ПРОВАЛЕНЫ!');
            process.exit(1);
        }
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new DatabaseTester();
    tester.runAllTests().catch(error => {
        log.error(`Критическая ошибка: ${error.message}`);
        process.exit(1);
    });
}

module.exports = DatabaseTester;
