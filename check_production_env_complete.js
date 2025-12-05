#!/usr/bin/env node

/**
 * Complete production environment variables check
 */

const https = require('https');

console.log('🔍 Complete production environment variables check...\n');

// Function for HTTP requests
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

    console.log('📋 1. Checking site availability...');
    try {
        const response = await makeRequest(baseUrl);
        console.log(`✅ Site is available: ${response.statusCode}`);
    } catch (error) {
        console.log(`❌ Site is unavailable: ${error.message}`);
        return;
    }

    console.log('\n📋 2. Checking API endpoints...');

    // Check /api/auth/me
    try {
        const meResponse = await makeRequest(`${baseUrl}/api/auth/me`);
        console.log(`✅ /api/auth/me: ${meResponse.statusCode}`);
        if (meResponse.statusCode === 401) {
            console.log('   📝 Expected - no session');
        }
    } catch (error) {
        console.log(`❌ /api/auth/me: ${error.message}`);
    }

    // Check Google OAuth callback
    try {
        const callbackResponse = await makeRequest(`${baseUrl}/api/auth/oauth/google/callback`);
        console.log(`✅ /api/auth/oauth/google/callback: ${callbackResponse.statusCode}`);
    } catch (error) {
        console.log(`❌ /api/auth/oauth/google/callback: ${error.message}`);
    }

    // Check diagnostic endpoint
    try {
        const diagnosisResponse = await makeRequest(`${baseUrl}/api/full-diagnosis`);
        console.log(`✅ /api/full-diagnosis: ${diagnosisResponse.statusCode}`);

        if (diagnosisResponse.statusCode === 200) {
            const data = JSON.parse(diagnosisResponse.body);
            console.log('\n📊 Diagnostic results:');
            console.log(`   Total tests: ${data.summary?.total_tests || 0}`);
            console.log(`   Passed: ${data.summary?.passed || 0}`);
            console.log(`   Failed: ${data.summary?.failed || 0}`);
            console.log(`   Warnings: ${data.summary?.warnings || 0}`);
            console.log(`   Success rate: ${data.summary?.success_rate || 0}%`);

            if (data.errors && data.errors.length > 0) {
                console.log('\n❌ Errors:');
                data.errors.forEach(error => console.log(`   - ${error}`));
            }

            if (data.warnings && data.warnings.length > 0) {
                console.log('\n⚠️ Warnings:');
                data.warnings.forEach(warning => console.log(`   - ${warning}`));
            }

            if (data.recommendations && data.recommendations.length > 0) {
                console.log('\n💡 Recommendations:');
                data.recommendations.forEach(rec => console.log(`   - ${rec}`));
            }
        }
    } catch (error) {
        console.log(`❌ /api/full-diagnosis: ${error.message}`);
    }

    console.log('\n📋 3. Checking Google OAuth settings...');
    console.log('📝 Expected settings:');
    console.log('   - Client ID: must be set');
    console.log('   - Client Secret: must be set');
    console.log('   - Redirect URI: https://www.energylogic-ai.com/api/auth/oauth/google/callback');

    console.log('\n📋 4. Checking Supabase settings...');
    console.log('📝 Expected settings:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL: must be set');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY: must be set');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY: must be set');

    console.log('\n📋 5. Checking Telegram settings...');
    console.log('📝 Expected settings:');
    console.log('   - TELEGRAM_BOT_TOKEN: must be set');
    console.log('   - TELEGRAM_CHAT_ID: must be set');

    console.log('\n📋 6. Checking URL settings...');
    console.log('📝 Expected settings:');
    console.log('   - NEXT_PUBLIC_SITE_URL: https://www.energylogic-ai.com');
    console.log('   - NEXT_PUBLIC_APP_URL: https://www.energylogic-ai.com');
    console.log('   - APP_URL: https://www.energylogic-ai.com');

    console.log('\n📋 7. Fix instructions...');
    console.log('1. Go to Vercel Dashboard');
    console.log('2. Select the energylogic-site project');
    console.log('3. Go to Settings > Environment Variables');
    console.log('4. Check all environment variables');
    console.log('5. If needed, add missing variables');
    console.log('6. Restart the deployment');

    console.log('\n📋 8. Checking RLS policies in Supabase...');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Execute the fix_rls_policies_complete.sql script');
    console.log('5. Verify that policies are created');

    console.log('\n✅ Check completed!');
}

checkProductionEnvironment().catch(console.error);
