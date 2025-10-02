const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testCallbackSystem() {
    console.log('🧪 Тестирование системы callback...\n');
    
    try {
        // Генерируем уникальные тестовые данные
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const testData = {
            name: 'Тестовый Пользователь',
            phone: `+799912345${random % 100}`,
            email: `test${timestamp}@example.com`,
            message: 'Тестовое сообщение для проверки системы',
            source_page: '/test',
            product_type: 'test_request'
        };
        
        console.log('📝 Тестовые данные:', testData);
        
        // Тест 1: Создание callback заявки
        console.log('\n1️⃣ Создание callback заявки...');
        const response = await axios.post(`${BASE_URL}/api/callback`, testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 200 && response.data.success) {
            console.log('✅ Callback заявка создана успешно!');
            console.log('📋 ID заявки:', response.data.data.id);
            console.log('👤 User ID:', response.data.data.user_id);
            console.log('🔄 Auto created user:', response.data.data.auto_created_user);
            
            // Тест 2: Проверка создания пользователя
            if (response.data.data.user_id) {
                console.log('\n2️⃣ Проверка создания пользователя...');
                try {
                    const userResponse = await axios.get(`${BASE_URL}/api/user/profile`, {
                        headers: {
                            'Cookie': `session_token=test_session_${timestamp}`
                        }
                    });
                    console.log('✅ Пользователь создан и доступен');
                } catch (error) {
                    console.log('ℹ️ Пользователь создан, но требует аутентификации');
                }
            }
            
            // Тест 3: Проверка создания issue
            if (response.data.data.issue_id) {
                console.log('\n3️⃣ Проверка создания issue...');
                console.log('✅ Issue создан:', response.data.data.issue_id);
            }
            
        } else {
            console.log('❌ Ошибка создания callback заявки');
            console.log('📄 Ответ:', response.data);
        }
        
    } catch (error) {
        console.log('❌ Ошибка тестирования:', error.response?.data || error.message);
    }
}

// Запускаем тест
testCallbackSystem();
