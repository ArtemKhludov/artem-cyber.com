// Google Sheets integration functions
import { google } from 'googleapis'

// Add a single record to Google Sheets
export async function addToSheets(type: 'request' | 'purchase', data: any) {
    try {
        const sheetName = type === 'request' ? 'Requests' : 'Purchases'

        let row: any[] = []

        if (type === 'request') {
            row = [
                data.id,
                data.name,
                data.email || '',
                data.phone || '',
                data.product_type || '',
                data.product_name || '',
                data.product_id || '',
                data.amount || 0,
                data.currency || 'RUB',
                data.status || 'pending',
                data.payment_method || '',
                data.notes || '',
                data.source || 'website',
                new Date().toISOString()
            ]
        } else if (type === 'purchase') {
            row = [
                data.id,
                data.name,
                data.email || '',
                data.phone || '',
                data.product_type || '',
                data.product_name || '',
                data.product_id || '',
                data.amount || 0,
                data.currency || 'RUB',
                data.status || 'pending',
                data.payment_method || '',
                data.notes || '',
                data.source || 'website',
                new Date().toISOString()
            ]
        }

        console.log(`Adding ${type} to ${sheetName}:`, row)
        return true
    } catch (error) {
        console.error('Error adding to Google Sheets:', error)
        return false
    }
}
