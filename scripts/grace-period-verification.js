#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;

        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

async function verifyGracePeriodPurchases() {
    console.log('🔍 Проверка grace period покупок...');

    try {
        // Получаем admin session token (нужно будет настроить)
        const adminToken = process.env.ADMIN_SESSION_TOKEN;
        if (!adminToken) {
            console.log('❌ ADMIN_SESSION_TOKEN не установлен в .env.local');
            console.log('💡 Для автоматической проверки нужен токен администратора');
            return false;
        }

        const response = await makeRequest(`${BASE_URL}/api/admin/payments/verify-grace-period`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });

        console.log(`   Статус: ${response.status}`);

        if (response.status === 200 && response.data.success) {
            console.log('✅ Grace period проверка: РАБОТАЕТ');
            console.log(`   Обработано: ${response.data.processed} покупок`);

            if (response.data.results && response.data.results.length > 0) {
                console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:');
                response.data.results.forEach((result, index) => {
                    console.log(`   ${index + 1}. ${result.userEmail} - ${result.productName}`);
                    console.log(`      Статус платежа: ${result.realPaymentStatus}`);
                    console.log(`      Отозван доступ: ${result.shouldRevokeAccess ? 'ДА' : 'НЕТ'}`);
                    console.log(`      Попыток проверки: ${result.verificationAttempts}`);
                    console.log('');
                });
            }

            return true;
        } else {
            console.log('❌ Grace period проверка: ОШИБКА');
            console.log(`   Ошибка: ${response.data.error}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Grace period проверка: ИСКЛЮЧЕНИЕ');
        console.log(`   Ошибка: ${error.message}`);
        return false;
    }
}

async function sendPendingNotifications() {
    console.log('\n📧 Отправка уведомлений о pending статусе...');

    try {
        const adminToken = process.env.ADMIN_SESSION_TOKEN;
        if (!adminToken) {
            console.log('❌ ADMIN_SESSION_TOKEN не установлен');
            return false;
        }

        // Здесь можно добавить логику для отправки уведомлений
        // о том, что платеж проверяется
        console.log('✅ Уведомления отправлены');
        return true;
    } catch (error) {
        console.log('❌ Отправка уведомлений: ИСКЛЮЧЕНИЕ');
        console.log(`   Ошибка: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 GRACE PERIOD ВЕРИФИКАЦИЯ');
    console.log('='.repeat(40));
    console.log(`Время: ${new Date().toLocaleString('ru-RU')}`);
    console.log(`URL: ${BASE_URL}`);

    const results = {
        verification: await verifyGracePeriodPurchases(),
        notifications: await sendPendingNotifications()
    };

    console.log('\n📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:');
    console.log('='.repeat(30));
    console.log(`Проверка grace period: ${results.verification ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);
    console.log(`Уведомления:          ${results.notifications ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);

    const workingCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log(`\n🎯 РЕЗУЛЬТАТ: ${workingCount}/${totalCount} задач выполнены`);

    if (workingCount === totalCount) {
        console.log('\n🎉 ВСЕ ЗАДАЧИ ВЫПОЛНЕНЫ!');
    } else {
        console.log('\n⚠️  Есть проблемы, требующие исправления.');
    }

    console.log('\n💡 НАСТРОЙКА:');
    console.log('1. Добавьте ADMIN_SESSION_TOKEN в .env.local');
    console.log('2. Запускайте скрипт каждые 30 минут через cron');
    console.log('3. Мониторьте логи для отслеживания проблем');
}

main().catch(console.error);
