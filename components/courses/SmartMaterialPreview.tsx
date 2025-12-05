'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Info, PlayCircle, Volume2, X } from 'lucide-react'

export type PreviewKind = 'video' | 'audio' | 'pdf' | 'unknown'

export interface PreviewItem {
  kind: PreviewKind
  title: string
  subtitle?: string
  url?: string
  expiresAt?: number
  downloadUrl?: string
  description?: string
}

interface SmartMaterialPreviewProps {
  item: PreviewItem | null
  onClose?: () => void
}

const formatRemaining = (expiresAt?: number) => {
  if (!expiresAt) return null
  const diff = Math.max(0, expiresAt - Date.now())
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes >= 1) {
    return `${minutes} min`
  }
  return `${Math.max(1, seconds)} sec`
}

export function SmartMaterialPreview({ item, onClose }: SmartMaterialPreviewProps) {
  const remaining = useMemo(() => formatRemaining(item?.expiresAt), [item?.expiresAt])

  if (!item) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Material preview</CardTitle>
          <CardDescription>Select video, audio or PDF to preview here.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const renderContent = () => {
    if (!item.url) {
      return (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700">
          <Info className="h-5 w-5" />
          <p className="text-sm">Signed link is not ready. Try again in a few seconds.</p>
        </div>
      )
    }

    switch (item.kind) {
      case 'video':
        return (
          <video className="h-64 w-full rounded-md bg-black" controls src={item.url}>
            Your browser does not support video playback.
          </video>
        )
      case 'audio':
        return (
          <div className="flex h-36 flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-4">
            <audio controls src={item.url} className="w-full">
              Your browser does not support audio playback.
            </audio>
          </div>
        )
      case 'pdf':
        return (
          <iframe
            src={`${item.url}#toolbar=0&navpanes=0`}
            title={item.title}
            className="h-72 w-full rounded-md border border-gray-200"
          />
        )
      default:
        return (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border border-gray-200 bg-white text-gray-600">
            <Info className="h-5 w-5" />
            <p className="text-sm">Preview for this material type is not supported yet.</p>
          </div>
        )
    }
  }

  const icon = item.kind === 'video' ? <PlayCircle className="h-4 w-4" />
    : item.kind === 'audio' ? <Volume2 className="h-4 w-4" />
    : item.kind === 'pdf' ? <Download className="h-4 w-4" />
    : <Info className="h-4 w-4" />

  return (
    <Card className="border border-indigo-100 shadow-sm">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase">
              {item.kind === 'video' ? 'Video' : item.kind === 'audio' ? 'Audio' : item.kind === 'pdf' ? 'PDF' : 'Material'}
            </Badge>
            {remaining && (
              <Badge className="bg-amber-100 text-amber-700">Link active: {remaining}</Badge>
            )}
          </div>
          <CardTitle className="mt-2 text-lg">{item.title}</CardTitle>
          {item.subtitle && <CardDescription>{item.subtitle}</CardDescription>}
        </div>
        <div className="flex gap-2">
          {item.url && (
            <Button size="sm" variant="outline" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>
              {icon}
              <span className="ml-2">Open in new tab</span>
            </Button>
          )}
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {renderContent()}
        {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
      </CardContent>
    </Card>
  )
}

export default SmartMaterialPreview
