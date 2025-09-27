'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

export type IssueContext = {
  subject: string
  purchaseId?: string
  purchaseName?: string
  purchaseStatus?: string
  purchaseStatusLabel?: string
  purchaseDate?: string
  productType?: string
  courseId?: string
  courseTitle?: string
  materialId?: string
  materialTitle?: string
  materialType?: string
  url?: string
  extra?: Record<string, unknown>
  issueType?: string
  issueSeverity?: string
}

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: IssueContext | null
  onSubmitted?: () => void
  track?: (event: string, payload?: Record<string, unknown>) => void
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export function ReportIssueDialog({ open, onOpenChange, context, onSubmitted, track }: ReportIssueDialogProps) {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [wantTelegramNotifications, setWantTelegramNotifications] = useState(false)
  const [wantEmailNotifications, setWantEmailNotifications] = useState(true)
  const [state, setState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setState('idle')
      setErrorMessage(null)
      setDetails('')
      if (context) {
        setSubject(context.subject)
      }
      // Автоматически заполняем email из авторизованного пользователя
      if (user?.email) {
        setEmail(user.email)
      }
    }
  }, [open, context, user])


  const handleSubmit = async () => {
    if (!context) return
    if (!details.trim()) {
      setErrorMessage('Опишите проблему, чтобы мы могли помочь.')
      return
    }
    if (details.trim().length < 30) {
      setErrorMessage('Описание должно содержать минимум 30 символов.')
      return
    }
    if (!email.trim()) {
      setErrorMessage('Укажите email для получения ответа.')
      return
    }

    if (wantTelegramNotifications && !telegram.trim()) {
      setErrorMessage('Для получения уведомлений в Telegram укажите ваш Telegram username (без @).')
      return
    }

    setState('submitting')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/user/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: subject || context.subject,
          description: details,
          issueType: 'technical',
          severity: 'medium',
          purchaseId: context.purchaseId,
          documentId: context.courseId || context.materialId,
          url: context.url,
          context: {
            ...context,
            email: email.trim(),
            phone: phone.trim(),
            telegram: telegram.trim(),
            wantTelegramNotifications,
            wantEmailNotifications
          }
        })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Не удалось отправить сообщение')
      }

      setState('success')
      track?.('issue_report_submitted', {
        purchaseId: context.purchaseId,
        courseId: context.courseId,
        materialId: context.materialId,
        type: 'technical',
        severity: 'medium'
      })
      onSubmitted?.()
    } catch (error) {
      console.error('Report issue submit error:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Неизвестная ошибка')
      track?.('issue_report_failed', {
        purchaseId: context.purchaseId,
        courseId: context.courseId,
        materialId: context.materialId,
        type: 'technical',
        severity: 'medium',
        error: error instanceof Error ? error.message : 'unknown'
      })
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setState('idle')
      setErrorMessage(null)
      setDetails('')
      setEmail('')
      setPhone('')
      setTelegram('')
      setWantTelegramNotifications(false)
      setWantEmailNotifications(true)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Сообщить о проблеме</DialogTitle>
          <DialogDescription>
            Расскажите, что пошло не так — мы передадим запрос команде поддержки.
          </DialogDescription>
        </DialogHeader>


        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="issue-subject">Тема</label>
            <Input
              id="issue-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Например: Не открывается курс"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="issue-description">Что случилось?</label>
            <Textarea
              id="issue-description"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Опишите шаги, которые привели к проблеме, и что вы ожидали увидеть."
              rows={4}
            />
            <p className="text-xs text-gray-500">Мы автоматически приложим технический контекст из карточки.</p>
          </div>


          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="issue-email">Контактный email для ответа *</label>
            <Input
              id="issue-email"
              type="email"
              value={email}
              placeholder="name@example.com"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <p className="text-xs text-gray-500">На этот email мы отправим ответ на ваше обращение</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="issue-phone">Телефон (необязательно)</label>
            <Input
              id="issue-phone"
              type="tel"
              value={phone}
              placeholder="+7 (999) 123-45-67"
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="text-xs text-gray-500">Для экстренной связи, если другие способы недоступны</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="want-email-notifications"
                checked={wantEmailNotifications}
                onChange={(event) => setWantEmailNotifications(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="want-email-notifications" className="text-sm font-medium text-gray-700">
                Получать уведомления на email
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="want-telegram-notifications"
                checked={wantTelegramNotifications}
                onChange={(event) => setWantTelegramNotifications(event.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="want-telegram-notifications" className="text-sm font-medium text-gray-700">
                Получать уведомления в Telegram
              </label>
            </div>

            {wantTelegramNotifications && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700" htmlFor="issue-telegram">Telegram username *</label>
                <Input
                  id="issue-telegram"
                  value={telegram}
                  placeholder="username (без @)"
                  onChange={(event) => setTelegram(event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Укажите ваш Telegram username без @. Мы будем отправлять уведомления о статусе обращения и ответах.
                </p>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="text-sm text-red-600">{errorMessage}</div>
          )}

          {state === 'success' && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Спасибо! Мы получили сообщение и свяжемся с вами при необходимости.
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Закрыть</Button>
          <Button onClick={handleSubmit} disabled={state === 'submitting' || state === 'success'}>
            {state === 'submitting' ? 'Отправка…' : state === 'success' ? 'Отправлено' : 'Отправить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReportIssueDialog
