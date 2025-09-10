/**
 * Скрипт миграции существующих PDF документов в мини-курсы
 * 
 * Этот скрипт:
 * 1. Обновляет существующие документы, устанавливая course_type = 'mini_course'
 * 2. Добавляет примеры URL для видео, аудио и рабочих тетрадей
 * 3. Обновляет метаданные курса
 * 
 * ВАЖНО: Перед запуском убедитесь, что:
 * - Выполнен SQL скрипт extend_documents_for_mini_courses.sql
 * - У вас есть доступ к Supabase
 * - Сделана резервная копия базы данных
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Инициализация Supabase клиента
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Получаем URL из Supabase Storage
async function getStorageUrls(courseSlug) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const bucket = 'course-materials'

    return {
        workbook: `${baseUrl}/storage/v1/object/public/${bucket}/courses/${courseSlug}/workbook.pdf`,
        videos: [
            `${baseUrl}/storage/v1/object/public/${bucket}/courses/${courseSlug}/videos/video1.mp4`,
            `${baseUrl}/storage/v1/object/public/${bucket}/courses/${courseSlug}/videos/video2.mp4`,
            `${baseUrl}/storage/v1/object/public/${bucket}/courses/${courseSlug}/videos/video3.mp4`
        ],
        audio: `${baseUrl}/storage/v1/object/public/${bucket}/courses/${courseSlug}/audio.mp3`,
        videoPreview: `${baseUrl}/storage/v1/object/public/${bucket}/courses/${courseSlug}/videos/preview.mp4`
    }
}

async function migrateDocumentsToMiniCourses() {
    console.log('🚀 Начинаем миграцию документов в мини-курсы...')

    try {
        // Получаем все существующие документы
        const { data: documents, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })

        if (fetchError) {
            throw new Error(`Ошибка получения документов: ${fetchError.message}`)
        }

        if (!documents || documents.length === 0) {
            console.log('📭 Документы не найдены')
            return
        }

        console.log(`📄 Найдено ${documents.length} документов для миграции`)

        // Мигрируем каждый документ
        for (const doc of documents) {
            console.log(`\n🔄 Мигрируем документ: "${doc.title}"`)

            // Мигрируем ВСЕ документы в мини-курсы
            const isQuantumIntention = true // Мигрируем все документы

            if (isQuantumIntention) {
                // Полная миграция в мини-курс
                let courseSlug = ''

                // Извлекаем название файла из URL
                if (doc.file_url) {
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

                const storageUrls = await getStorageUrls(courseSlug)

                const updateData = {
                    course_type: 'mini_course',
                    workbook_url: storageUrls.workbook,
                    video_urls: storageUrls.videos,
                    audio_url: storageUrls.audio,
                    video_preview_url: storageUrls.videoPreview,
                    course_duration_minutes: 25, // 20-30 страниц PDF + 3 видео по 5-7 минут + аудио 5 минут
                    video_count: storageUrls.videos.length,
                    has_workbook: true,
                    has_audio: true,
                    has_videos: true,
                    updated_at: new Date().toISOString()
                }

                const { error: updateError } = await supabase
                    .from('documents')
                    .update(updateData)
                    .eq('id', doc.id)

                if (updateError) {
                    console.error(`❌ Ошибка обновления документа "${doc.title}":`, updateError.message)
                } else {
                    console.log(`✅ Документ "${doc.title}" успешно мигрирован в мини-курс`)
                }
            } else {
                // Оставляем как PDF, но устанавливаем course_type
                const updateData = {
                    course_type: 'pdf',
                    updated_at: new Date().toISOString()
                }

                const { error: updateError } = await supabase
                    .from('documents')
                    .update(updateData)
                    .eq('id', doc.id)

                if (updateError) {
                    console.error(`❌ Ошибка обновления документа "${doc.title}":`, updateError.message)
                } else {
                    console.log(`📄 Документ "${doc.title}" оставлен как PDF`)
                }
            }
        }

        console.log('\n🎉 Миграция завершена!')

        // Показываем статистику
        const { data: stats } = await supabase
            .from('documents')
            .select('course_type')

        const miniCourses = stats?.filter(d => d.course_type === 'mini_course').length || 0
        const pdfs = stats?.filter(d => d.course_type === 'pdf').length || 0

        console.log(`\n📊 Статистика после миграции:`)
        console.log(`   Мини-курсы: ${miniCourses}`)
        console.log(`   PDF документы: ${pdfs}`)

    } catch (error) {
        console.error('💥 Критическая ошибка миграции:', error.message)
        process.exit(1)
    }
}

// Функция для отката миграции (если потребуется)
async function rollbackMigration() {
    console.log('🔄 Откатываем миграцию...')

    try {
        const { error } = await supabase
            .from('documents')
            .update({
                course_type: 'pdf',
                workbook_url: null,
                video_urls: null,
                audio_url: null,
                video_preview_url: null,
                course_duration_minutes: null,
                video_count: null,
                has_workbook: false,
                has_audio: false,
                has_videos: false,
                updated_at: new Date().toISOString()
            })
            .neq('id', '00000000-0000-0000-0000-000000000000') // Обновляем все записи

        if (error) {
            throw new Error(`Ошибка отката: ${error.message}`)
        }

        console.log('✅ Откат миграции выполнен успешно')
    } catch (error) {
        console.error('💥 Ошибка отката:', error.message)
    }
}

// Основная функция
async function main() {
    const args = process.argv.slice(2)

    if (args.includes('--rollback')) {
        await rollbackMigration()
    } else {
        await migrateDocumentsToMiniCourses()
    }
}

// Проверяем наличие необходимых переменных окружения
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Отсутствуют необходимые переменные окружения:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nУбедитесь, что файл .env.local существует и содержит эти переменные')
    process.exit(1)
}

// Запускаем скрипт
main().catch(console.error)
