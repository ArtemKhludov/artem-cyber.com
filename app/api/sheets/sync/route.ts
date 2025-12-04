import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), 'config', 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!
const REQUESTS_SHEET = 'Requests'
const PURCHASES_SHEET = 'Purchases'

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

    return NextResponse.json({ success: true, message: 'Sync completed' })
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error)
    return NextResponse.json(
      { error: 'Sync error' },
      { status: 500 }
    )
  }
}

async function syncRequests() {
  // Fetch requests from Supabase
  const { data: requests, error } = await supabase
    .from('callback_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Prepare data for Google Sheets with headers
  const rows = [
    ['ID', 'Name', 'Email', 'Phone', 'Created At', 'Status', 'Priority', 'Source', 'Product/Service', 'Notes', 'Product Type']
  ]

  requests?.forEach(request => {
    rows.push([
      request.id,
      request.name,
      request.email || '',
      request.phone || '',
      new Date(request.created_at).toLocaleString('en-US'),
      request.status || 'new',
      request.priority || 'medium',
      request.source || 'website',
      request.product_name || '',
      request.notes || '',
      request.product_type || 'callback'
    ])
  })

  // Clear and populate the "Requests" sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REQUESTS_SHEET}!A:K`,
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${REQUESTS_SHEET}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  })

  // Apply header formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: await getSheetId(REQUESTS_SHEET),
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
  // Fetch purchases from Supabase
  const { data: purchases, error } = await supabase
    .from('purchase_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Prepare data for Google Sheets with headers
  const rows = [
    ['ID', 'Name', 'Email', 'Phone', 'Created At', 'Product', 'Amount', 'Currency', 'Status', 'Payment Method']
  ]

  purchases?.forEach(purchase => {
    rows.push([
      purchase.id,
      purchase.name,
      purchase.email || '',
      purchase.phone || '',
      new Date(purchase.created_at).toLocaleString('en-US'),
      purchase.product_name,
      purchase.amount?.toString() || '',
      purchase.currency || 'RUB',
      purchase.status || 'pending',
      purchase.payment_method || ''
    ])
  })

  // Clear and populate the "Purchases" sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${PURCHASES_SHEET}!A:J`,
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${PURCHASES_SHEET}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  })

  // Apply header formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: await getSheetId(PURCHASES_SHEET),
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

// Helper to append a single record
async function addToSheets(type: 'request' | 'purchase', data: any) {
  try {
    const sheetName = type === 'request' ? REQUESTS_SHEET : PURCHASES_SHEET

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

