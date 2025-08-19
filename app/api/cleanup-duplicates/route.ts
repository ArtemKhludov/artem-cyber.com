import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 API: Начинаем очистку дубликатов...')
    
    // Получаем все документы
    const { data: allDocs, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Ошибка получения документов', 
        details: fetchError 
      }, { status: 500 })
    }

    if (!allDocs || allDocs.length === 0) {
      return NextResponse.json({ 
        message: 'Документов не найдено', 
        duplicatesRemoved: 0 
      })
    }

    // Группируем по названию
    const groups: { [title: string]: any[] } = {}
    allDocs.forEach(doc => {
      if (!groups[doc.title]) {
        groups[doc.title] = []
      }
      groups[doc.title].push(doc)
    })

    // Находим дубликаты
    const idsToDelete: string[] = []
    const report: any[] = []
    
    Object.entries(groups).forEach(([title, docs]) => {
      if (docs.length > 1) {
        // Сортируем по дате (новые первыми)
        docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        const keepDoc = docs[0]
        const duplicates = docs.slice(1)
        
        idsToDelete.push(...duplicates.map(doc => doc.id))
        
        report.push({
          title,
          totalCopies: docs.length,
          keeping: keepDoc.id,
          removing: duplicates.map(d => d.id)
        })
      }
    })

    if (idsToDelete.length === 0) {
      return NextResponse.json({ 
        message: 'Дубликаты не найдены', 
        duplicatesRemoved: 0,
        report: []
      })
    }

    // Удаляем дубликаты
    let deletedCount = 0
    const batchSize = 5
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize)
      
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .in('id', batch)

      if (!deleteError) {
        deletedCount += batch.length
      }
      
      // Небольшая пауза
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return NextResponse.json({
      message: `Успешно удалено ${deletedCount} дубликатов`,
      duplicatesRemoved: deletedCount,
      uniqueDocuments: Object.keys(groups).length,
      report
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера', 
      details: error 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Просто проверяем состояние базы
    const { data: docs, error } = await supabase
      .from('documents')
      .select('title')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const titleCounts = docs.reduce((acc: any, doc) => {
      acc[doc.title] = (acc[doc.title] || 0) + 1
      return acc
    }, {})

    const duplicates = Object.entries(titleCounts).filter(([_, count]) => count > 1)

    return NextResponse.json({
      totalDocuments: docs.length,
      uniqueTitles: Object.keys(titleCounts).length,
      duplicates: duplicates.map(([title, count]) => ({ title, count })),
      hasDuplicates: duplicates.length > 0
    })

  } catch (error) {
    return NextResponse.json({ error: 'Ошибка проверки' }, { status: 500 })
  }
}
