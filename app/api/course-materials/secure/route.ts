import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkCourseAccess } from '@/lib/course-auth'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * API для получения подписанных URL медиафайлов курса
 * URL имеют ограниченный срок жизни для безопасности
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const courseId = searchParams.get('course_id')
        const filePath = searchParams.get('file_path')
        const expiresIn = parseInt(searchParams.get('expires_in') || '3600') // По умолчанию 1 час

        if (!courseId || !filePath) {
            return NextResponse.json({
                error: 'Необходимы параметры course_id и file_path'
            }, { status: 400 })
        }

        // Проверяем доступ к курсу
        const accessCheck = await checkCourseAccess(courseId)

        if (!accessCheck.hasAccess) {
            return NextResponse.json({
                error: accessCheck.error || 'Доступ запрещен'
            }, { status: 403 })
        }

        // Извлекаем относительный путь из полного URL Supabase Storage
        let relativePath = filePath
        if (filePath.includes('/storage/v1/object/private/course-materials-private/')) {
            relativePath = filePath.split('/storage/v1/object/private/course-materials-private/')[1]
        }

        // Проверяем, что файл принадлежит данному курсу
        if (!relativePath.startsWith(`courses/`)) {
            return NextResponse.json({
                error: 'Неверный путь к файлу'
            }, { status: 403 })
        }

        // Проверяем, существует ли файл
        const { data: fileList, error: listError } = await supabase.storage
            .from('course-materials-private')
            .list(relativePath.split('/').slice(0, -1).join('/'), {
                search: relativePath.split('/').pop()
            })

        if (listError || !fileList || fileList.length === 0) {
            console.error('File not found:', relativePath)
            return NextResponse.json({
                error: 'Файл не найден'
            }, { status: 404 })
        }

        // Создаем подписанный URL с ограниченным сроком жизни
        const { data, error } = await supabase.storage
            .from('course-materials-private')
            .createSignedUrl(relativePath, expiresIn)

        if (error) {
            console.error('Error creating signed URL:', error)
            return NextResponse.json({
                error: 'Ошибка создания ссылки на файл'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            signed_url: data.signedUrl,
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            file_path: relativePath
        })

    } catch (error) {
        console.error('Error in secure materials API:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера'
        }, { status: 500 })
    }
}

/**
 * API для получения информации о медиафайле без скачивания
 */
export async function HEAD(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const courseId = searchParams.get('course_id')
        const filePath = searchParams.get('file_path')

        if (!courseId || !filePath) {
            return NextResponse.json({
                error: 'Необходимы параметры course_id и file_path'
            }, { status: 400 })
        }

        // Проверяем доступ к курсу
        const accessCheck = await checkCourseAccess(courseId)

        if (!accessCheck.hasAccess) {
            return NextResponse.json({
                error: accessCheck.error || 'Доступ запрещен'
            }, { status: 403 })
        }

        // Получаем информацию о файле
        const { data, error } = await supabase.storage
            .from('course-materials-private')
            .list(filePath.split('/').slice(0, -1).join('/'), {
                search: filePath.split('/').pop()
            })

        if (error || !data || data.length === 0) {
            return NextResponse.json({
                error: 'Файл не найден'
            }, { status: 404 })
        }

        const fileInfo = data[0]

        return NextResponse.json({
            success: true,
            file_info: {
                name: fileInfo.name,
                size: fileInfo.metadata?.size,
                last_modified: fileInfo.updated_at,
                content_type: fileInfo.metadata?.mimetype
            }
        })

    } catch (error) {
        console.error('Error getting file info:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера'
        }, { status: 500 })
    }
}
