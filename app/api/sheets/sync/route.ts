import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Инициализация Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), 'config', 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()

    if (type === 'requests') {
      await syncRequests()
    } else if (type === 'purchases') {
      await syncPurchases()
    } else {
      await syncAll()
    }

    return NextResponse.json({ success: true, message: 'Синхронизация завершена' })
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error)
    return NextResponse.json(
      { error: 'Ошибка синхронизации' },
      { status: 500 }
    )
  }
}

async function syncRequests() {
  // Получаем заявки из Supabase
  const { data: requests, error } = await supabase
    .from('callback_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Подготавливаем данные для Google Sheets с заголовками
  const rows = [
    ['ID', 'Имя', 'Email', 'Телефон', 'Дата создания', 'Статус', 'Приоритет', 'Источник', 'Товар/Услуга', 'Заметки', 'Тип продукта']
  ]

  requests?.forEach(request => {
    rows.push([
      request.id,
      request.name,
      request.email || '',
      request.phone || '',
      new Date(request.created_at).toLocaleString('ru-RU'),
      request.status || 'new',
      request.priority || 'medium',
      request.source || 'website',
      request.product_name || '',
      request.notes || '',
      request.product_type || 'callback'
    ])
  })

  // Очищаем и заполняем лист "Заявки"
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Заявки!A:K',
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Заявки!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  })

  // Добавляем форматирование заголовков
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: await getSheetId('Заявки'),
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        }
      ]
    }
  })
}

async function syncPurchases() {
  // Получаем покупки из Supabase
  const { data: purchases, error } = await supabase
    .from('purchase_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Подготавливаем данные для Google Sheets с заголовками
  const rows = [
    ['ID', 'Имя', 'Email', 'Телефон', 'Дата создания', 'Товар', 'Сумма', 'Валюта', 'Статус', 'Способ оплаты']
  ]

  purchases?.forEach(purchase => {
    rows.push([
      purchase.id,
      purchase.name,
      purchase.email || '',
      purchase.phone || '',
      new Date(purchase.created_at).toLocaleString('ru-RU'),
      purchase.product_name,
      purchase.amount?.toString() || '',
      purchase.currency || 'RUB',
      purchase.status || 'pending',
      purchase.payment_method || ''
    ])
  })

  // Очищаем и заполняем лист "Покупки"
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Покупки!A:J',
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Покупки!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  })

  // Добавляем форматирование заголовков
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: await getSheetId('Покупки'),
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.8, blue: 0.2 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        }
      ]
    }
  })
}

async function getSheetId(sheetName: string): Promise<number> {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  })

  const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName)
  return sheet?.properties?.sheetId || 0
}

async function syncAll() {
  await syncRequests()
  await syncPurchases()
}

// Функция для добавления одной записи
async function addToSheets(type: 'request' | 'purchase', data: any) {
  try {
    const sheetName = type === 'request' ? 'Заявки' : 'Покупки'

    let row: any[] = []

    if (type === 'request') {
      row = [
        data.id,
        data.name,
        data.email || '',
        data.phone || '',
        new Date(data.created_at).toLocaleString('ru-RU'),
        data.status || 'new',
        data.priority || 'medium',
        data.source || 'website',
        data.product_name || '',
        data.notes || '',
        data.product_type || 'callback'
      ]
    } else {
      row = [
        data.id,
        data.name,
        data.email || '',
        data.phone || '',
        new Date(data.created_at).toLocaleString('ru-RU'),
        data.product_name,
        data.amount?.toString() || '',
        data.currency || 'RUB',
        data.status || 'pending',
        data.payment_method || ''
      ]
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:K`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    })

    return true
  } catch (error) {
    console.error('Error adding to Google Sheets:', error)
    return false
  }
}

