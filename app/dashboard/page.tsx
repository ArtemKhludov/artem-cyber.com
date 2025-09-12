'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Download,
  Star,
  Trophy,
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  Gift,
  Award,
  Target,
  TrendingUp,
  Volume2
} from 'lucide-react'

interface Purchase {
  id: string
  product_name: string
  product_type: 'mini_course' | 'pdf' | 'session'
  price: number
  status: 'completed' | 'in_progress' | 'pending'
  created_at: string
  progress?: number
  document?: {
    id: string
    title: string
    description: string
    cover_url: string
    course_type: 'pdf' | 'mini_course'
    has_workbook: boolean
    has_videos: boolean
    has_audio: boolean
    video_count: number
    workbook_count: number
    course_duration_minutes: number
  }
  pdf_url?: string
  session_date?: string
  session_time?: string
}

interface Course {
  id: string
  title: string
  description: string
  progress: number
  total_lessons: number
  completed_lessons: number
  thumbnail: string
  duration: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  course_type: 'pdf' | 'mini_course'
  has_workbook: boolean
  has_videos: boolean
  has_audio: boolean
  video_count: number
  workbook_count: number
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalCourses: 0,
    completedCourses: 0,
    totalSpent: 0
  })

  useEffect(() => {
    if (user) {
      // Загружаем данные пользователя
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/user/dashboard')

      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases)

        // Преобразуем курсы из покупок
        const courseData = data.courses.map((purchase: any) => ({
          id: purchase.id,
          title: purchase.document?.title || purchase.product_name,
          description: purchase.document?.description || 'Купленный курс',
          progress: purchase.progress || 0,
          total_lessons: purchase.document?.course_type === 'mini_course' ?
            (purchase.document?.workbook_count || 0) + (purchase.document?.video_count || 0) + 1 : 1,
          completed_lessons: Math.floor((purchase.progress || 0) / 100 *
            (purchase.document?.course_type === 'mini_course' ?
              (purchase.document?.workbook_count || 0) + (purchase.document?.video_count || 0) + 1 : 1)),
          thumbnail: purchase.document?.cover_url || '/api/placeholder/300/200',
          duration: purchase.document?.course_duration_minutes ?
            `${Math.floor(purchase.document.course_duration_minutes / 60)}ч ${purchase.document.course_duration_minutes % 60}м` : 'Не указано',
          difficulty: 'beginner' as const,
          course_type: purchase.document?.course_type || 'pdf',
          has_workbook: purchase.document?.has_workbook || false,
          has_videos: purchase.document?.has_videos || false,
          has_audio: purchase.document?.has_audio || false,
          video_count: purchase.document?.video_count || 0,
          workbook_count: purchase.document?.workbook_count || 0
        }))

        setCourses(courseData)
        setStats(data.stats)
      } else {
        // Если API недоступен, используем моковые данные
        setPurchases([
          {
            id: '1',
            product_name: 'Mini-сессия',
            product_type: 'session',
            price: 4999,
            status: 'completed',
            created_at: '2024-01-15',
            progress: 100
          },
          {
            id: '2',
            product_name: 'Глубокий день',
            product_type: 'session',
            price: 24999,
            status: 'in_progress',
            created_at: '2024-01-20',
            progress: 65
          }
        ])

        setCourses([
          {
            id: '1',
            title: 'Основы трансформации личности',
            description: 'Изучите базовые принципы изменения мышления и поведения',
            progress: 75,
            total_lessons: 12,
            completed_lessons: 9,
            thumbnail: '/api/placeholder/300/200',
            duration: '2 часа',
            difficulty: 'beginner',
            course_type: 'mini_course',
            has_workbook: true,
            has_videos: true,
            has_audio: false,
            video_count: 5,
            workbook_count: 3
          },
          {
            id: '2',
            title: 'Продвинутые техники работы с подсознанием',
            description: 'Глубокие методы проработки внутренних блоков',
            progress: 30,
            total_lessons: 8,
            completed_lessons: 2,
            thumbnail: '/api/placeholder/300/200',
            duration: '3 часа',
            difficulty: 'advanced',
            course_type: 'pdf',
            has_workbook: false,
            has_videos: false,
            has_audio: true,
            video_count: 0,
            workbook_count: 0
          }
        ])

        setStats({
          totalPurchases: 2,
          totalCourses: 2,
          completedCourses: 0,
          totalSpent: 29998
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    }
  }

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'mini_course': return 'Мини-курс'
      case 'pdf': return 'PDF-документ'
      case 'session': return 'Энергетическая диагностика'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Если пользователь не загружен, показываем загрузку
  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Заголовок */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Добро пожаловать, {user.name || user.email}!
                </h1>
                <p className="text-xl text-gray-600">
                  Ваш личный кабинет для трансформации
                </p>
              </div>
              <Button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Выйти
              </Button>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Всего покупок</p>
                    <p className="text-3xl font-bold text-blue-900">{stats.totalPurchases}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Курсы</p>
                    <p className="text-3xl font-bold text-purple-900">{stats.totalCourses}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Завершено</p>
                    <p className="text-3xl font-bold text-green-900">{stats.completedCourses}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Потрачено</p>
                    <p className="text-3xl font-bold text-orange-900">{stats.totalSpent.toLocaleString()} ₽</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Основной контент */}
          <Tabs defaultValue="purchases" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="purchases">Мои покупки</TabsTrigger>
              <TabsTrigger value="courses">Курсы</TabsTrigger>
              <TabsTrigger value="achievements">Достижения</TabsTrigger>
              <TabsTrigger value="gifts">Подарки</TabsTrigger>
            </TabsList>

            {/* Мои покупки */}
            <TabsContent value="purchases" className="space-y-6">
              <div className="grid gap-6">
                {purchases.map((purchase) => (
                  <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{purchase.product_name}</CardTitle>
                          <CardDescription>
                            {getProductTypeLabel(purchase.product_type)} • {new Date(purchase.created_at).toLocaleDateString('ru-RU')}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{purchase.price.toLocaleString()} ₽</p>
                          <Badge className={getStatusColor(purchase.status)}>
                            {purchase.status === 'completed' ? 'Завершено' :
                              purchase.status === 'in_progress' ? 'В процессе' : 'Ожидает'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {purchase.progress && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Прогресс</span>
                            <span>{purchase.progress}%</span>
                          </div>
                          <Progress value={purchase.progress} className="h-2" />
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        {purchase.product_type === 'session' ? (
                          <>
                            {purchase.pdf_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={purchase.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  Скачать отчет
                                </a>
                              </Button>
                            )}
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/download/${purchase.id}`} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Просмотр
                              </a>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/courses/${purchase.document?.id}/player`}>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Открыть курс
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Курсы */}
            <TabsContent value="courses" className="space-y-6">
              <div className="grid gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
                          <CardDescription className="mb-4">{course.description}</CardDescription>

                          {/* Информация о типе курса */}
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={course.course_type === 'mini_course' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                              {course.course_type === 'mini_course' ? 'Мини-курс' : 'PDF-документ'}
                            </Badge>
                            {course.duration !== 'Не указано' && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="h-4 w-4" />
                                {course.duration}
                              </div>
                            )}
                          </div>

                          {/* Доступные материалы */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              Основной PDF
                            </div>
                            {course.has_workbook && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4 text-orange-500" />
                                {course.workbook_count} тетрадей
                              </div>
                            )}
                            {course.has_videos && (
                              <div className="flex items-center gap-1">
                                <PlayCircle className="h-4 w-4 text-indigo-500" />
                                {course.video_count} видео
                              </div>
                            )}
                            {course.has_audio && (
                              <div className="flex items-center gap-1">
                                <Volume2 className="h-4 w-4 text-red-500" />
                                Аудио
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{course.progress}%</p>
                          <p className="text-sm text-gray-600">Завершено</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Прогресс курса</span>
                          <span>{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" asChild>
                          <a href={`/download/${course.id}`} target="_blank" rel="noopener noreferrer">
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Открыть курс
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/courses/${course.id}`} target="_blank" rel="noopener noreferrer">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Просмотр
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Достижения */}
            <TabsContent value="achievements" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                  <CardContent className="p-6 text-center">
                    <Award className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-yellow-900 mb-2">Первый шаг</h3>
                    <p className="text-sm text-yellow-700">Завершили первую сессию</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-6 text-center">
                    <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-blue-900 mb-2">Целеустремленный</h3>
                    <p className="text-sm text-blue-700">Завершили 3 курса</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-6 text-center">
                    <Star className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-purple-900 mb-2">Эксперт</h3>
                    <p className="text-sm text-purple-700">Завершили все курсы</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Подарки */}
            <TabsContent value="gifts" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-6 text-center">
                    <Gift className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-green-900 mb-2">Бонусный PDF</h3>
                    <p className="text-sm text-green-700 mb-4">Дополнительные материалы по трансформации</p>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Получить
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-pink-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-pink-900 mb-2">Персональная консультация</h3>
                    <p className="text-sm text-pink-700 mb-4">30 минут с экспертом</p>
                    <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                      Записаться
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                  <CardContent className="p-6 text-center">
                    <Trophy className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-indigo-900 mb-2">Эксклюзивный доступ</h3>
                    <p className="text-sm text-indigo-700 mb-4">К закрытому сообществу</p>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      Присоединиться
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}
