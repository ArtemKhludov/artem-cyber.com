/**
 * Скрипт для создания правильной структуры папок в Supabase Storage
 * на основе реальных названий PDF-файлов
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

// Функция для создания структуры курса
function createCourseStructure(courseSlug) {
    return {
        'main.pdf': 'Заглушка основного PDF',
        'workbook.pdf': 'Заглушка рабочей тетради',
        'videos': {
            'video1.mp4': 'Заглушка видео 1: Что такое намерение до мысли',
            'video2.mp4': 'Заглушка видео 2: Ошибки при работе с намерением',
            'video3.mp4': 'Заглушка видео 3: Пример перезаписи на простом кейсе',
            'preview.mp4': 'Заглушка превью видео'
        },
        'audio.mp3': 'Заглушка аудио-настройки'
    }
}

// Создаем заглушки файлов
function createPlaceholderFile(filename, content) {
    const tempDir = path.join(__dirname, 'temp_placeholders')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }

    const filePath = path.join(tempDir, filename)
    fs.writeFileSync(filePath, content)
    return filePath
}

// Рекурсивно создаем структуру папок и загружаем файлы
async function createStorageStructure(structure, basePath = '') {
    for (const [name, content] of Object.entries(structure)) {
        const currentPath = basePath ? `${basePath}/${name}` : name

        if (typeof content === 'object' && !Array.isArray(content)) {
            // Это папка - создаем структуру рекурсивно
            console.log(`📁 Создаем папку: ${currentPath}`)
            await createStorageStructure(content, currentPath)
        } else {
            // Это файл - создаем заглушку и загружаем
            console.log(`📄 Создаем файл: ${currentPath}`)

            let placeholderContent = content
            let mimeType = 'text/plain'

            // Определяем тип файла и создаем соответствующую заглушку
            if (name.endsWith('.pdf')) {
                placeholderContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Заглушка PDF файла) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`
                mimeType = 'application/pdf'
            } else if (name.endsWith('.mp4')) {
                // Создаем минимальный MP4 заголовок
                placeholderContent = Buffer.from([
                    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
                    0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
                    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
                ])
                mimeType = 'video/mp4'
            } else if (name.endsWith('.mp3')) {
                // Создаем минимальный MP3 заголовок
                placeholderContent = Buffer.from([
                    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
                ])
                mimeType = 'audio/mpeg'
            }

            const tempFile = createPlaceholderFile(name, placeholderContent)

            try {
                // Читаем файл
                const fileBuffer = fs.readFileSync(tempFile)

                // Загружаем в Supabase Storage
                const { data, error } = await supabase.storage
                    .from('course-materials')
                    .upload(currentPath, fileBuffer, {
                        contentType: mimeType,
                        upsert: true
                    })

                if (error) {
                    console.error(`❌ Ошибка загрузки ${currentPath}:`, error.message)
                } else {
                    console.log(`✅ Загружен: ${currentPath}`)
                }

                // Удаляем временный файл
                fs.unlinkSync(tempFile)

            } catch (error) {
                console.error(`❌ Ошибка обработки ${currentPath}:`, error.message)
            }
        }
    }
}

// Основная функция
async function main() {
    console.log('🚀 Создаем правильную структуру Storage на основе реальных PDF-файлов...')

    try {
        // Получаем все документы из базы данных
        const { data: documents, error } = await supabase
            .from('documents')
            .select('id, title, file_url')
            .order('created_at', { ascending: false })

        if (error) {
            throw new Error(`Ошибка получения документов: ${error.message}`)
        }

        if (!documents || documents.length === 0) {
            console.log('📭 Документы не найдены')
            return
        }

        console.log(`📄 Найдено ${documents.length} документов`)

        // Создаем структуру папок для каждого документа
        const storageStructure = {
            'courses': {}
        }

        documents.forEach(doc => {
            // Извлекаем название файла из URL
            let courseSlug = ''

            if (doc.file_url) {
                // Извлекаем название файла из URL
                const urlParts = doc.file_url.split('/')
                const fileName = urlParts[urlParts.length - 1]
                const fileNameWithoutExt = fileName.replace('.pdf', '').split('?')[0]

                // Преобразуем в slug
                courseSlug = fileNameWithoutExt
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
            }

            // Если не удалось извлечь из URL, используем заголовок
            if (!courseSlug) {
                courseSlug = doc.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
            }

            storageStructure.courses[courseSlug] = createCourseStructure(courseSlug)
            console.log(`📁 Подготовлена структура для: ${doc.title}`)
            console.log(`   Slug: ${courseSlug}`)
        })

        // Создаем структуру папок и загружаем заглушки
        await createStorageStructure(storageStructure)

        console.log('\n🎉 Создание правильной структуры Storage завершено!')
        console.log(`\n📁 Создано ${documents.length} курсов с правильными названиями папок`)

        // Очищаем временную папку
        const tempDir = path.join(__dirname, 'temp_placeholders')
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
        }

    } catch (error) {
        console.error('💥 Критическая ошибка:', error.message)
        process.exit(1)
    }
}

// Запускаем скрипт
main().catch(console.error)
