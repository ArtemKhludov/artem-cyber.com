require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testVideoWorkbookSystem() {
    try {
        console.log('🧪 Тестируем систему видео-воркбук связок...');

        // 1. Проверяем структуру таблицы course_workbooks
        console.log('\n📊 Проверяем структуру таблицы course_workbooks...');

        // Получаем одну запись для проверки структуры
        const { data: sampleWorkbook, error: sampleError } = await supabase
            .from('course_workbooks')
            .select('*')
            .limit(1);

        if (sampleError) {
            console.error('❌ Ошибка доступа к таблице course_workbooks:', sampleError);
            return;
        }

        if (sampleWorkbook && sampleWorkbook.length > 0) {
            console.log('✅ Структура таблицы course_workbooks:');
            Object.keys(sampleWorkbook[0]).forEach(key => {
                const value = sampleWorkbook[0][key];
                console.log(`  - ${key}: ${typeof value} ${value !== null ? `(${value})` : '(null)'}`);
            });

            // Проверяем, есть ли поле video_url
            const hasVideoUrl = 'video_url' in sampleWorkbook[0];
            if (!hasVideoUrl) {
                console.log('\n⚠️ Поле video_url отсутствует в таблице course_workbooks');
                console.log('📝 Необходимо выполнить SQL команду:');
                console.log('ALTER TABLE course_workbooks ADD COLUMN video_url TEXT;');
                console.log('\n💡 Выполните эту команду в Supabase Dashboard > SQL Editor');
            } else {
                console.log('\n✅ Поле video_url найдено в таблице!');
            }
        } else {
            console.log('📝 Таблица course_workbooks пуста');
        }

        // 2. Тестируем API воркбуков
        console.log('\n🔍 Тестируем API воркбуков...');

        // Получаем первый документ для тестирования
        const { data: documents, error: documentsError } = await supabase
            .from('documents')
            .select('id, title')
            .limit(1);

        if (documentsError || !documents || documents.length === 0) {
            console.log('⚠️ Нет документов для тестирования');
            return;
        }

        const testDocumentId = documents[0].id;
        console.log(`📄 Тестируем с документом: ${documents[0].title} (${testDocumentId})`);

        // Тестируем GET запрос
        const { data: workbooks, error: workbooksError } = await supabase
            .from('course_workbooks')
            .select('*')
            .eq('document_id', testDocumentId)
            .order('order_index', { ascending: true });

        if (workbooksError) {
            console.error('❌ Ошибка получения воркбуков:', workbooksError);
        } else {
            console.log(`✅ Найдено воркбуков: ${workbooks?.length || 0}`);
            if (workbooks && workbooks.length > 0) {
                workbooks.forEach((wb, index) => {
                    console.log(`  ${index + 1}. ${wb.title} (видео: ${wb.video_url ? 'есть' : 'нет'})`);
                });
            }
        }

        // 3. Тестируем API endpoints
        console.log('\n🌐 Тестируем API endpoints...');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/workbooks?documentId=${testDocumentId}`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ API GET /api/admin/workbooks работает');
                console.log(`   Получено воркбуков: ${data.workbooks?.length || 0}`);
            } else {
                console.log(`⚠️ API GET /api/admin/workbooks вернул статус: ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️ Не удалось протестировать API (возможно, сервер не запущен)');
        }

        console.log('\n🎉 Тестирование завершено!');

        console.log('\n📋 Следующие шаги:');
        console.log('1. Запустите сервер разработки: npm run dev');
        console.log('2. Откройте админ-панель и протестируйте загрузку видео для воркбуков');
        console.log('3. Проверьте отображение видео+воркбук пар в плеере курса');
        console.log('4. Убедитесь, что видео отображается на публичных страницах каталога');

    } catch (err) {
        console.error('❌ Ошибка тестирования:', err.message);
    }
}

testVideoWorkbookSystem();
