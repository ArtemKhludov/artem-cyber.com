#!/usr/bin/env node

/**
 * Полная проверка переменных окружения в продакшне
 */

const https = require('https');

console.log('🔍 Полная проверка переменных окружения в продакшне...\n');

// Функция для HTTP запросов
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function checkProductionEnvironment() {
    const baseUrl = 'https://www.energylogic-ai.com';
    
    console.log('📋 1. Проверка доступности сайта...');
    try {
        const response = await makeRequest(baseUrl);
        console.log(`✅ Сайт доступен: ${response.statusCode}`);
    } catch (error) {
        console.log(`❌ Сайт недоступен: ${error.message}`);
        return;
    }
    
    console.log('\n📋 2. Проверка API endpoints...');
    
    // Проверяем /api/auth/me
    try {
        const meResponse = await makeRequest(`${baseUrl}/api/auth/me`);
        console.log(`✅ /api/auth/me: ${meResponse.statusCode}`);
        if (meResponse.statusCode === 401) {
            console.log('   📝 Ожидаемо - нет сессии');
        }
    } catch (error) {
        console.log(`❌ /api/auth/me: ${error.message}`);
    }
    
    // Проверяем Google OAuth callback
    try {
        const callbackResponse = await makeRequest(`${baseUrl}/api/auth/oauth/google/callback`);
        console.log(`✅ /api/auth/oauth/google/callback: ${callbackResponse.statusCode}`);
    } catch (error) {
        console.log(`❌ /api/auth/oauth/google/callback: ${error.message}`);
    }
    
    // Проверяем новый диагностический endpoint
    try {
        const diagnosisResponse = await makeRequest(`${baseUrl}/api/full-diagnosis`);
        console.log(`✅ /api/full-diagnosis: ${diagnosisResponse.statusCode}`);
        
        if (diagnosisResponse.statusCode === 200) {
            const data = JSON.parse(diagnosisResponse.body);
            console.log('\n📊 Результаты диагностики:');
            console.log(`   Всего тестов: ${data.summary?.total_tests || 0}`);
            console.log(`   Успешно: ${data.summary?.passed || 0}`);
            console.log(`   Ошибки: ${data.summary?.failed || 0}`);
            console.log(`   Предупреждения: ${data.summary?.warnings || 0}`);
            console.log(`   Успешность: ${data.summary?.success_rate || 0}%`);
            
            if (data.errors && data.errors.length > 0) {
                console.log('\n❌ Ошибки:');
                data.errors.forEach(error => console.log(`   - ${error}`));
            }
            
            if (data.warnings && data.warnings.length > 0) {
                console.log('\n⚠️ Предупреждения:');
                data.warnings.forEach(warning => console.log(`   - ${warning}`));
            }
            
            if (data.recommendations && data.recommendations.length > 0) {
                console.log('\n💡 Рекомендации:');
                data.recommendations.forEach(rec => console.log(`   - ${rec}`));
            }
        }
    } catch (error) {
        console.log(`❌ /api/full-diagnosis: ${error.message}`);
    }
    
    console.log('\n📋 3. Проверка Google OAuth настроек...');
    console.log('📝 Ожидаемые настройки:');
    console.log('   - Client ID: должен быть установлен');
    console.log('   - Client Secret: должен быть установлен');
    console.log('   - Redirect URI: https://www.energylogic-ai.com/api/auth/oauth/google/callback');
    
    console.log('\n📋 4. Проверка Supabase настроек...');
    console.log('📝 Ожидаемые настройки:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL: должен быть установлен');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY: должен быть установлен');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY: должен быть установлен');
    
    console.log('\n📋 5. Проверка Telegram настроек...');
    console.log('📝 Ожидаемые настройки:');
    console.log('   - TELEGRAM_BOT_TOKEN: должен быть установлен');
    console.log('   - TELEGRAM_CHAT_ID: должен быть установлен');
    
    console.log('\n📋 6. Проверка URL настроек...');
    console.log('📝 Ожидаемые настройки:');
    console.log('   - NEXT_PUBLIC_SITE_URL: https://www.energylogic-ai.com');
    console.log('   - NEXT_PUBLIC_APP_URL: https://www.energylogic-ai.com');
    console.log('   - APP_URL: https://www.energylogic-ai.com');
    
    console.log('\n📋 7. Инструкции по исправлению...');
    console.log('1. Зайдите в Vercel Dashboard');
    console.log('2. Выберите проект energylogic-site');
    console.log('3. Перейдите в Settings > Environment Variables');
    console.log('4. Проверьте все переменные окружения');
    console.log('5. Если нужно, добавьте недостающие переменные');
    console.log('6. Перезапустите деплой');
    
    console.log('\n📋 8. Проверка RLS политик в Supabase...');
    console.log('1. Зайдите в Supabase Dashboard');
    console.log('2. Выберите ваш проект');
    console.log('3. Перейдите в SQL Editor');
    console.log('4. Выполните SQL скрипт fix_rls_policies_complete.sql');
    console.log('5. Проверьте, что политики созданы');
    
    console.log('\n✅ Проверка завершена!');
}

checkProductionEnvironment().catch(console.error);
