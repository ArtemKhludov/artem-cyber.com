import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Function to send Telegram notifications
async function sendTelegramNotification(message: string) {
  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!telegramResponse.ok) {
      console.error('Telegram notification failed:', await telegramResponse.text())
    }
  } catch (telegramError) {
    console.error('Telegram error:', telegramError)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    const supabase = getSupabaseAdmin()

    if (type === 'purchase') {
      const { data: result, error } = await supabase
        .from('purchase_requests')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error adding purchase:', error)
        return NextResponse.json(
          { error: 'Failed to add purchase', details: error.message },
          { status: 500 }
        )
      }

      // Send Telegram notification
      const telegramMessage = `🛒 New purchase from CRM system:
👤 Name: ${data.name}
📧 Email: ${data.email || 'Not specified'}
📞 Phone: ${data.phone}
📦 Product type: ${data.product_type}
🛍️ Name: ${data.product_name}
💰 Amount: ${data.amount} ${data.currency}
💳 Payment method: ${data.payment_method}
📝 Status: ${data.status}
📝 Notes: ${data.notes || 'None'}
🌐 Source: ${data.source}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Purchase added successfully'
      })
    } else if (type === 'request') {
      const { data: result, error } = await supabase
        .from('callback_requests')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error adding request:', error)
        return NextResponse.json(
          { error: 'Failed to add request', details: error.message },
          { status: 500 }
        )
      }

      // Send Telegram notification
      const telegramMessage = `🆕 New request from CRM system:
👤 Name: ${data.name}
📧 Email: ${data.email || 'Not specified'}
📞 Phone: ${data.phone}
📦 Type: ${data.product_type || 'callback'}
🛍️ Product/Service: ${data.product_name || 'Call request'}
📝 Notes: ${data.notes || 'None'}
🌐 Source: ${data.source_page || 'unknown'}
📊 Status: ${data.status}
⭐ Priority: ${data.priority}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Request added successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid data type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin data POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'requests'
    const supabase = getSupabaseAdmin()

    if (type === 'requests') {
      // Requests (leads) - from callback_requests
      const { data, error } = await supabase
        .from('callback_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching requests:', error)
        return NextResponse.json(
          { error: 'Failed to load requests' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else if (type === 'purchases') {
      // Purchases - from purchase_requests
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching purchases:', error)
        return NextResponse.json(
          { error: 'Failed to load purchases' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else if (type === 'documents') {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('title', { ascending: true })

      if (error) {
        console.error('Error fetching documents:', error)
        return NextResponse.json(
          { error: 'Failed to load documents' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    } else if (type === 'payments') {
      // Real payments: purchases table
      const { data, error } = await supabase
        .from('purchases')
        .select('id, user_id, user_email, document_id, payment_status, payment_method, amount_paid, currency, stripe_payment_intent_id, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching payments:', error)
        return NextResponse.json(
          { error: 'Failed to load payments' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      })
    }

    return NextResponse.json(
      { error: 'Invalid data type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin data error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update request or purchase
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    const supabase = getSupabaseAdmin()

    if (type === 'purchase') {
      // Get old data for comparison
      const { data: oldData, error: fetchError } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching old purchase data:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch purchase data' },
          { status: 500 }
        )
      }

      // Update data
      const { data: result, error } = await supabase
        .from('purchase_requests')
        .update({
          ...oldData,
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating purchase:', error)
        return NextResponse.json(
          { error: 'Failed to update purchase', details: error.message },
          { status: 500 }
        )
      }

      // Send Telegram notification
      const telegramMessage = `✏️ Purchase updated in CRM system:
🆔 ID: ${id}
👤 Name: ${result.name}
📧 Email: ${result.email || 'Not specified'}
📞 Phone: ${result.phone}
📦 Product type: ${result.product_type}
🛍️ Name: ${result.product_name}
💰 Amount: ${result.amount} ${result.currency}
💳 Payment method: ${result.payment_method}
📝 Status: ${result.status}
📝 Notes: ${result.notes || 'None'}
🌐 Source: ${result.source}

📊 Changes:
${Object.keys(data).map(key => {
        if (oldData[key] !== data[key]) {
          return `• ${key}: "${oldData[key]}" → "${data[key]}"`
        }
        return null
      }).filter(Boolean).join('\n') || '• No changes'}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Purchase updated successfully'
      })

    } else if (type === 'request') {
      // Get old data for comparison
      const { data: oldData, error: fetchError } = await supabase
        .from('callback_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching old request data:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch request data' },
          { status: 500 }
        )
      }

      // Update data
      const { data: result, error } = await supabase
        .from('callback_requests')
        .update({
          ...oldData,
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating request:', error)
        return NextResponse.json(
          { error: 'Failed to update request', details: error.message },
          { status: 500 }
        )
      }

      // Send Telegram notification
      const telegramMessage = `✏️ Request updated in CRM system:
🆔 ID: ${id}
👤 Name: ${result.name}
📧 Email: ${result.email || 'Not specified'}
📞 Phone: ${result.phone}
📝 Message: ${result.message}
📅 Preferred time: ${result.preferred_time || 'Not specified'}
📊 Status: ${result.status}
📝 Admin notes: ${result.admin_notes || 'None'}
🌐 Source: ${result.source}
📦 Product type: ${result.product_type}
🛍️ Product name: ${result.product_name}

📊 Changes:
${Object.keys(data).map(key => {
        if (oldData[key] !== data[key]) {
          return `• ${key}: "${oldData[key]}" → "${data[key]}"`
        }
        return null
      }).filter(Boolean).join('\n') || '• No changes'}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Request updated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid data type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete request or purchase
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type or ID not specified' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    if (type === 'purchase') {
      // Get data before deletion
      const { data: oldData, error: fetchError } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching purchase data:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch purchase data' },
          { status: 500 }
        )
      }

      // Delete data
      const { error } = await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting purchase:', error)
        return NextResponse.json(
          { error: 'Failed to delete purchase', details: error.message },
          { status: 500 }
        )
      }

      // Send Telegram notification
      const telegramMessage = `🗑️ Purchase deleted from CRM system:
🆔 ID: ${id}
👤 Name: ${oldData.name}
📧 Email: ${oldData.email || 'Not specified'}
📞 Phone: ${oldData.phone}
📦 Product type: ${oldData.product_type}
🛍️ Name: ${oldData.product_name}
💰 Amount: ${oldData.amount} ${oldData.currency}
💳 Payment method: ${oldData.payment_method}
📝 Status: ${oldData.status}
📝 Notes: ${oldData.notes || 'None'}
🌐 Source: ${oldData.source}
📅 Created: ${new Date(oldData.created_at).toLocaleString('en-US')}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        message: 'Purchase deleted successfully'
      })

    } else if (type === 'request') {
      // Get data before deletion
      const { data: oldData, error: fetchError } = await supabase
        .from('callback_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching request data:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch request data' },
          { status: 500 }
        )
      }

      // Delete data
      const { error } = await supabase
        .from('callback_requests')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting request:', error)
        return NextResponse.json(
          { error: 'Failed to delete request', details: error.message },
          { status: 500 }
        )
      }

      // Send Telegram notification
      const telegramMessage = `🗑️ Request deleted from CRM system:
🆔 ID: ${id}
👤 Name: ${oldData.name}
📧 Email: ${oldData.email || 'Not specified'}
📞 Phone: ${oldData.phone}
📝 Message: ${oldData.message}
📅 Preferred time: ${oldData.preferred_time || 'Not specified'}
📊 Status: ${oldData.status}
📝 Admin notes: ${oldData.admin_notes || 'None'}
🌐 Source: ${oldData.source}
📦 Product type: ${oldData.product_type}
🛍️ Product name: ${oldData.product_name}
📅 Created: ${new Date(oldData.created_at).toLocaleString('en-US')}`

      await sendTelegramNotification(telegramMessage)

      return NextResponse.json({
        success: true,
        message: 'Request deleted successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid data type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Admin delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
