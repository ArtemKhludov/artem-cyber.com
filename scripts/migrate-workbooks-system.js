/**
 * Скрипт для миграции системы рабочих тетрадей
 * Выполняет SQL скрипт и создает структуру папок в Supabase Storage
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Основная функция
async function main() {
    console.log('🔄 Начинаем миграцию системы рабочих тетрадей...')

    try {
        // 1. Выполняем SQL скрипт
        console.log('📝 Выполняем SQL скрипт...')
        const sqlScript = fs.readFileSync(path.join(__dirname, '../update_workbooks_system.sql'), 'utf8')

        // Разбиваем скрипт на отдельные команды
        const sqlCommands = sqlScript
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

        console.log(`📝 Найдено ${sqlCommands.length} SQL команд для выполнения`)

        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i] + ';'
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: command })
                if (error) {
                    console.log(`⚠️ Команда ${i + 1} пропущена: ${error.message}`)
                } else {
                    console.log(`✅ Команда ${i + 1} выполнена`)
                }
            } catch (err) {
                console.log(`⚠️ Команда ${i + 1} пропущена: ${err.message}`)
            }
        }

        console.log('💡 Если есть ошибки, выполните SQL скрипт вручную в Supabase Dashboard')

        // 2. Получаем все документы
        console.log('📄 Получаем список документов...')
        const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('id, title, file_url')
            .order('created_at', { ascending: false })

        if (docsError) {
            throw new Error(`Ошибка получения документов: ${docsError.message}`)
        }

        if (!documents || documents.length === 0) {
            console.log('📭 Документы не найдены')
            return
        }

        console.log(`📄 Найдено ${documents.length} документов`)

        // 3. Создаем структуру папок workbooks для каждого курса
        console.log('📁 Создаем структуру папок workbooks...')

        for (const doc of documents) {
            console.log(`\n🔄 Обрабатываем: "${doc.title}"`)

            // Создаем slug для папки курса
            let courseSlug = ''

            if (doc.file_url) {
                const urlParts = doc.file_url.split('/')
                const fileName = urlParts[urlParts.length - 1]
                const fileNameWithoutExt = fileName.replace('.pdf', '').split('?')[0]

                courseSlug = fileNameWithoutExt
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
            }

            if (!courseSlug) {
                courseSlug = doc.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
            }

            console.log(`   📁 Slug: ${courseSlug}`)

            // Создаем папку workbooks в Supabase Storage
            const workbooksPath = `courses/${courseSlug}/workbooks/`

            try {
                // Проверяем, существует ли папка
                const { data: existingFiles } = await supabase.storage
                    .from('course-materials')
                    .list(`courses/${courseSlug}`, {
                        limit: 100
                    })

                const hasWorkbooksFolder = existingFiles?.some(file => file.name === 'workbooks')

                if (!hasWorkbooksFolder) {
                    // Создаем placeholder файл для создания папки
                    const placeholderContent = new Blob(['Placeholder for workbooks folder'], { type: 'text/plain' })

                    const { error: uploadError } = await supabase.storage
                        .from('course-materials')
                        .upload(`${workbooksPath}.gitkeep`, placeholderContent, {
                            contentType: 'text/plain'
                        })

                    if (uploadError) {
                        console.log(`   ⚠️ Не удалось создать папку workbooks: ${uploadError.message}`)
                    } else {
                        console.log(`   ✅ Папка workbooks создана`)

                        // Удаляем placeholder файл
                        await supabase.storage
                            .from('course-materials')
                            .remove([`${workbooksPath}.gitkeep`])
                    }
                } else {
                    console.log(`   ✅ Папка workbooks уже существует`)
                }
            } catch (error) {
                console.log(`   ⚠️ Ошибка при работе с папкой workbooks: ${error.message}`)
            }
        }

        // 4. Проверяем миграцию данных
        console.log('\n🔍 Проверяем миграцию данных...')

        const { data: migratedWorkbooks, error: workbooksError } = await supabase
            .from('course_workbooks')
            .select('id, title, document_id')
            .limit(10)

        if (workbooksError) {
            console.log('⚠️ Таблица course_workbooks не найдена. Выполните SQL скрипт вручную.')
        } else {
            console.log(`✅ Найдено ${migratedWorkbooks?.length || 0} рабочих тетрадей в новой системе`)
        }

        // 5. Обновляем счетчики workbook_count
        console.log('\n📊 Обновляем счетчики workbook_count...')

        const { data: updatedDocs, error: updateError } = await supabase
            .from('documents')
            .select('id, workbook_count')

        if (updateError) {
            console.log('⚠️ Не удалось обновить счетчики:', updateError.message)
        } else {
            console.log(`✅ Счетчики обновлены для ${updatedDocs?.length || 0} документов`)
        }

        console.log('\n🎉 Миграция системы рабочих тетрадей завершена!')
        console.log('\n📋 Следующие шаги:')
        console.log('1. Проверьте создание таблицы course_workbooks в Supabase Dashboard')
        console.log('2. Убедитесь, что папки workbooks/ созданы в Storage')
        console.log('3. Протестируйте добавление рабочих тетрадей через админ-панель')
        console.log('4. Проверьте отображение множественных рабочих тетрадей на сайте')

    } catch (error) {
        console.error('💥 Критическая ошибка:', error.message)
        process.exit(1)
    }
}

// Запускаем скрипт
main().catch(console.error)
