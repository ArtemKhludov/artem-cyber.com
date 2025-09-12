import { notFound } from 'next/navigation'

interface PlayerPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params

  // Временная заглушка для player страницы
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Курс-плеер
        </h1>
        <p className="text-gray-600 mb-4">
          ID курса: {id}
        </p>
        <p className="text-sm text-gray-500">
          Страница находится в разработке
        </p>
      </div>
    </div>
  )
}
