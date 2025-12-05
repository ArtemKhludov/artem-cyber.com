'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FileText,
    PlayCircle,
    Volume2,
    Download,
    Lock,
    BookOpen,
    Clock,
    ShoppingCart
} from 'lucide-react'
import type { Document, Workbook, CourseVideo, CourseAudio } from '@/types'

interface CourseStructureProps {
    document: Document & {
        course_workbooks?: Workbook[]
        course_videos?: CourseVideo[]
        course_audio?: CourseAudio[]
    }
    isPurchased?: boolean
    onPurchase?: () => void
}

export function CourseStructure({ document, isPurchased = false, onPurchase }: CourseStructureProps) {
    const workbookCount = document.workbook_count || document.course_workbooks?.length || 0
    const videoCount = document.video_count || document.course_videos?.length || 0
    const audioCount = (document as any).audio_count || document.course_audio?.length || 0

    const renderMaterialCard = (
        title: string,
        description: string,
        count: number,
        icon: React.ReactNode,
        items: Array<{ id: string; title: string; description?: string }>,
        hasAccess: boolean = false
    ) => {
        if (count === 0) return null

        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {icon}
                        <span>{title}</span>
                        <Badge variant="secondary">{count}</Badge>
                    </CardTitle>
                    <CardDescription>
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium">{index + 1}. {item.title}</div>
                                    {item.description && (
                                        <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasAccess ? (
                                        <Button size="sm" variant="outline">
                                            <Download className="h-4 w-4 mr-2" />
                                            Open
                                        </Button>
                                    ) : (
                                        <div className="flex items-center text-gray-400">
                                            <Lock className="h-4 w-4 mr-2" />
                                            <span className="text-sm">Purchase required</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Main course info */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <h1 className="text-3xl font-bold">{document.title}</h1>
                    <Badge variant="outline" className="text-sm">
                        {document.course_type === 'mini_course' ? 'Mini course' : 'PDF guide'}
                    </Badge>
                </div>

                <p className="text-lg text-gray-600 mb-6">
                    {document.description}
                </p>

                {/* Detailed description */}
                {document.course_description && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2">About this course</h3>
                        <p className="text-blue-800">{document.course_description}</p>
                    </div>
                )}

                {/* Course stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <BookOpen className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold">{workbookCount}</div>
                        <div className="text-sm text-gray-600">Workbooks</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <PlayCircle className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{videoCount}</div>
                        <div className="text-sm text-gray-600">Videos</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Volume2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">{audioCount}</div>
                        <div className="text-sm text-gray-600">Audio</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Clock className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold">{document.course_duration_minutes || 'N/A'}</div>
                        <div className="text-sm text-gray-600">Minutes</div>
                    </div>
                </div>
            </div>

            {/* Main PDF */}
            {document.main_pdf_title && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-green-600" />
                            <span>{document.main_pdf_title}</span>
                        </CardTitle>
                        <CardDescription>
                            {document.main_pdf_description || 'Main course material'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                                <div className="font-medium">Main PDF File</div>
                                <div className="text-sm text-gray-600 mt-1">
                                    {document.main_pdf_description || 'Primary course material'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isPurchased ? (
                                    <Button size="sm" variant="outline">
                                        <Download className="h-4 w-4 mr-2" />
                                        Open PDF
                                    </Button>
                                ) : (
                                    <div className="flex items-center text-gray-400">
                                        <Lock className="h-4 w-4 mr-2" />
                                        <span className="text-sm">Purchase required</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Workbooks */}
            {renderMaterialCard(
                'Workbooks',
                'Practice exercises to reinforce material',
                workbookCount,
                <FileText className="h-5 w-5 text-orange-600" />,
                document.course_workbooks || [],
                isPurchased
            )}

            {/* Video lessons */}
            {renderMaterialCard(
                'Video lessons',
                'Video explanations and demos',
                videoCount,
                <PlayCircle className="h-5 w-5 text-blue-600" />,
                document.course_videos || [],
                isPurchased
            )}

            {/* Audio materials */}
            {renderMaterialCard(
                'Audio materials',
                'Audio lectures and meditations',
                audioCount,
                <Volume2 className="h-5 w-5 text-green-600" />,
                document.course_audio || [],
                isPurchased
            )}

            {/* Purchase Button */}
            {!isPurchased && (
                <div className="text-center mt-8">
                    <Button size="lg" onClick={onPurchase} className="px-8">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Buy course for {document.price_rub} ₽
                    </Button>
                </div>
            )}
        </div>
    )
}
