/**
 * Скрипт для перемещения приватных материалов курсов в приватный bucket
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
    console.log('🔐 Перемещаем приватные материалы в приватный bucket...')

    try {
        // Получаем все документы из базы данных
        const { data: documents, error } = await supabase
            .from('documents')
            .select('id, title, file_url, workbook_url, video_urls, audio_url')
            .order('created_at', { ascending: false })

        if (error) {
            throw new Error(`Ошибка получения документов: ${error.message}`)
        }

        if (!documents || documents.length === 0) {
            console.log('📭 Документы не найдены')
            return
        }

        console.log(`📄 Найдено ${documents.length} документов`)

        // Обрабатываем каждый документ
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

            const updates = {}

            // Перемещаем основной PDF
            if (doc.file_url && doc.file_url.includes('course-materials')) {
                try {
                    const newPdfPath = `courses/${courseSlug}/main.pdf`
                    const { data: publicUrlData } = supabase.storage
                        .from('course-materials-private')
                        .getPublicUrl(newPdfPath)

                    updates.file_url = publicUrlData.publicUrl
                    console.log('   📄 PDF перемещен в приватный bucket')
                } catch (error) {
                    console.log(`   ❌ Ошибка перемещения PDF: ${error.message}`)
                }
            }

            // Перемещаем рабочую тетрадь
            if (doc.workbook_url && doc.workbook_url.includes('course-materials')) {
                try {
                    const newWorkbookPath = `courses/${courseSlug}/workbook.pdf`
                    const { data: publicUrlData } = supabase.storage
                        .from('course-materials-private')
                        .getPublicUrl(newWorkbookPath)

                    updates.workbook_url = publicUrlData.publicUrl
                    console.log('   📚 Рабочая тетрадь перемещена в приватный bucket')
                } catch (error) {
                    console.log(`   ❌ Ошибка перемещения тетради: ${error.message}`)
                }
            }

            // Перемещаем аудио
            if (doc.audio_url && doc.audio_url.includes('course-materials')) {
                try {
                    const newAudioPath = `courses/${courseSlug}/audio.mp3`
                    const { data: publicUrlData } = supabase.storage
                        .from('course-materials-private')
                        .getPublicUrl(newAudioPath)

                    updates.audio_url = publicUrlData.publicUrl
                    console.log('   🎵 Аудио перемещено в приватный bucket')
                } catch (error) {
                    console.log(`   ❌ Ошибка перемещения аудио: ${error.message}`)
                }
            }

            // Перемещаем видео
            if (doc.video_urls && Array.isArray(doc.video_urls)) {
                try {
                    const newVideoUrls = doc.video_urls.map((url, index) => {
                        const newVideoPath = `courses/${courseSlug}/videos/video${index + 1}.mp4`
                        const { data: publicUrlData } = supabase.storage
                            .from('course-materials-private')
                            .getPublicUrl(newVideoPath)
                        return publicUrlData.publicUrl
                    })

                    updates.video_urls = newVideoUrls
                    console.log(`   🎬 ${doc.video_urls.length} видео перемещены в приватный bucket`)
                } catch (error) {
                    console.log(`   ❌ Ошибка перемещения видео: ${error.message}`)
                }
            }

            // Обновляем URL в базе данных
            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                    .from('documents')
                    .update(updates)
                    .eq('id', doc.id)

                if (updateError) {
                    console.log(`   ❌ Ошибка обновления БД: ${updateError.message}`)
                } else {
                    console.log('   ✅ URL обновлены в базе данных')
                }
            }
        }

        console.log('\n🎉 Перемещение приватных материалов завершено!')
        console.log('\n📋 Следующие шаги:')
        console.log('1. Создать API endpoint для получения приватных файлов')
        console.log('2. Добавить проверку авторизации и оплаты')
        console.log('3. Обновить компоненты для работы с приватными URL')

    } catch (error) {
        console.error('💥 Критическая ошибка:', error.message)
        process.exit(1)
    }
}

// Запускаем скрипт
main().catch(console.error)
