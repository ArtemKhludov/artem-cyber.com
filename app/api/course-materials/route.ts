import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const filePath = searchParams.get('path')
        const documentId = searchParams.get('documentId')

        if (!filePath || !documentId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            )
        }

        // Проверяем авторизацию пользователя
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Authorization required' },
                { status: 401 }
            )
        }

        // Извлекаем токен из заголовка
        const token = authHeader.replace('Bearer ', '')

        // Проверяем токен через Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            )
        }

        // Проверяем, есть ли у пользователя доступ к документу
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_email', user.email)
            .eq('document_id', documentId)
            .eq('payment_status', 'completed')
            .single()

        if (purchaseError || !purchase) {
            return NextResponse.json(
                { error: 'Access denied. Purchase required.' },
                { status: 403 }
            )
        }

        // Получаем файл из приватного bucket (используем правильное имя)
        const { data, error } = await supabase.storage
            .from('course-materials')
            .download(filePath)

        if (error) {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            )
        }

        // Определяем тип файла
        const fileExtension = filePath.split('.').pop()?.toLowerCase()
        let contentType = 'application/octet-stream'

        switch (fileExtension) {
            case 'pdf':
                contentType = 'application/pdf'
                break
            case 'mp4':
                contentType = 'video/mp4'
                break
            case 'mp3':
                contentType = 'audio/mpeg'
                break
            case 'png':
                contentType = 'image/png'
                break
            case 'jpg':
            case 'jpeg':
                contentType = 'image/jpeg'
                break
        }

        // Возвращаем файл
        return new NextResponse(data, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
                'Cache-Control': 'private, max-age=3600',
            },
        })

    } catch (error) {
        console.error('Error serving course material:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
