'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/PageLayout'

export default function CleanupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)

  const checkStatus = async () => {
    try {
      setLoading(true
      const response = await fetch('/api/cleanup-duplicates'
      const data = await response.json(
      setStatus(data
    } catch (error) {
      console.error('Error checking status:', error
    } finally {
      setLoading(false
    }
  }

  const runCleanup = async () => {
    try {
      setLoading(true
      const response = await fetch('/api/cleanup-duplicates', {
        method: 'POST'
      }
      const data = await response.json(
      setResult(data
      
      // Обновляем статус после очистки
      await checkStatus(
    } catch (error) {
      console.error('Error running cleanup:', error
      setResult({ error: 'Ошибка выполнения очистки' }
    } finally {
      setLoading(false
    }
  }

  return (
    <PageLayout>
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Админ панель - Очистка дубликатов</h1>
      
      <div className="space-y-6">
        {/* Проверка статуса */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Текущее состояние базы данных</h2>
          <Button 
            onClick={checkStatus} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? 'Проверяем...' : 'Проверить статус'}
          </Button>
          
          {status && (
            <div className="bg-gray-50 rounded p-4">
              <p><strong>Всего документов:</strong> {status.totalDocuments}</p>
              <p><strong>Уникальных названий:</strong> {status.uniqueTitles}</p>
              <p><strong>Есть дубликаты:</strong> {status.hasDuplicates ? '❌ Да' : '✅ Нет'}</p>
              
              {status.duplicates && status.duplicates.length > 0 && (
                <div className="mt-4">
                  <p><strong>Дубликаты:</strong></p>
                  <ul className="list-disc list-inside mt-2">
                    {status.duplicates.map((dup: any, index: number) => (
                      <li key={index}>
                        {dup.title} ({dup.count} копий
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Очистка дубликатов */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Очистка дубликатов</h2>
          <Button 
            onClick={runCleanup} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 mb-4"
          >
            {loading ? 'Удаляем дубликаты...' : 'Удалить дубликаты'}
          </Button>
          
          {result && (
            <div className={`rounded p-4 ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              {result.error ? (
                <p><strong>Ошибка:</strong> {result.error}</p>
              ) : (
                <div>
                  <p><strong>{result.message}</strong></p>
                  {result.report && result.report.length > 0 && (
                    <div className="mt-4">
                      <p><strong>Подробности:</strong></p>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {result.report.map((item: any, index: number) => (
                          <li key={index}>
                            {item.title}: оставлена 1 копия из {item.totalCopies}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Быстрые ссылки */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Быстрые ссылки</h2>
          <div className="space-x-4">
            <Button 
              onClick={() => window.open('http://localhost:3000', '_blank')}
              variant="outline"
            >
              Главная страница
            </Button>
            <Button 
              onClick={() => window.open('http://localhost:3000/catalog', '_blank')}
              variant="outline"
            >
              Каталог
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Обновить страницу
            </Button>
          </div>
        </div>
      </div>
    </div>
  
    </PageLayout>
}
}
