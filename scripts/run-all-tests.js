#!/usr/bin/env node

/**
 * Главный скрипт для запуска всех тестов
 * Запускает тестирование системы, базы данных и UI
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

class TestRunner {
    constructor() {
        this.results = {
            system: null,
            database: null,
            ui: null,
            overall: {
                passed: 0,
                failed: 0,
                total: 0
            }
        };
    }

    async runScript(scriptName, description) {
        return new Promise((resolve, reject) => {
            log.section(`🚀 ${description}`);

            const scriptPath = path.join(__dirname, scriptName);
            const child = spawn('node', [scriptPath], {
                stdio: 'inherit',
                env: { ...process.env }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    log.success(`${description} завершено успешно`);
                    resolve({ success: true, code });
                } else {
                    log.error(`${description} завершено с ошибкой (код: ${code})`);
                    resolve({ success: false, code });
                }
            });

            child.on('error', (error) => {
                log.error(`Ошибка запуска ${description}: ${error.message}`);
                reject(error);
            });
        });
    }

    async loadTestResults() {
        const resultFiles = [
            { file: 'test-results.json', key: 'system' },
            { file: 'test-database-results.json', key: 'database' },
            { file: 'test-ui-results.json', key: 'ui' }
        ];

        for (const { file, key } of resultFiles) {
            const filePath = path.join(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.results[key] = data.results;
                } catch (error) {
                    log.warning(`Не удалось загрузить результаты ${file}: ${error.message}`);
                }
            }
        }
    }

    calculateOverallResults() {
        const tests = [this.results.system, this.results.database, this.results.ui];

        for (const test of tests) {
            if (test) {
                this.results.overall.total += test.total;
                this.results.overall.passed += test.passed;
                this.results.overall.failed += test.failed;
            }
        }
    }

    printOverallResults() {
        log.section('📊 ОБЩИЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');

        console.log(`\n${colors.bright}Сводка по категориям:${colors.reset}`);

        if (this.results.system) {
            const status = this.results.system.failed === 0 ?
                `${colors.green}✓${colors.reset}` :
                `${colors.red}✗${colors.reset}`;
            console.log(`  ${status} Системные тесты: ${this.results.system.passed}/${this.results.system.total}`);
        }

        if (this.results.database) {
            const status = this.results.database.failed === 0 ?
                `${colors.green}✓${colors.reset}` :
                `${colors.red}✗${colors.reset}`;
            console.log(`  ${status} Тесты БД: ${this.results.database.passed}/${this.results.database.total}`);
        }

        if (this.results.ui) {
            const status = this.results.ui.failed === 0 ?
                `${colors.green}✓${colors.reset}` :
                `${colors.red}✗${colors.reset}`;
            console.log(`  ${status} UI тесты: ${this.results.ui.passed}/${this.results.ui.total}`);
        }

        console.log(`\n${colors.bright}Общая статистика:${colors.reset}`);
        console.log(`  Всего тестов: ${this.results.overall.total}`);
        console.log(`  ${colors.green}Пройдено: ${this.results.overall.passed}${colors.reset}`);
        console.log(`  ${colors.red}Провалено: ${this.results.overall.failed}${colors.reset}`);
        console.log(`  Процент успеха: ${Math.round((this.results.overall.passed / this.results.overall.total) * 100)}%`);

        // Сохранение общего отчета
        const reportPath = path.join(__dirname, '..', 'test-overall-results.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            results: this.results
        }, null, 2));

        log.info(`Общий отчет сохранен в: ${reportPath}`);

        if (this.results.overall.failed === 0) {
            log.success('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
            return true;
        } else {
            log.error('❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ!');
            return false;
        }
    }

    async runAllTests() {
        log.section('🧪 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ');

        try {
            // Запускаем тесты системы
            await this.runScript('test-system.js', 'Тестирование системы');

            // Запускаем тесты базы данных
            await this.runScript('test-database.js', 'Тестирование базы данных');

            // Запускаем тесты UI
            await this.runScript('test-ui.js', 'Тестирование UI компонентов');

            // Загружаем результаты
            await this.loadTestResults();

            // Вычисляем общие результаты
            this.calculateOverallResults();

            // Выводим результаты
            const allPassed = this.printOverallResults();

            process.exit(allPassed ? 0 : 1);

        } catch (error) {
            log.error(`Критическая ошибка: ${error.message}`);
            process.exit(1);
        }
    }
}

// Запуск тестирования
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests();
}

module.exports = TestRunner;
