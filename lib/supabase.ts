import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export createClient for server-side usage
export { createClient }

// Server-side client with service role key
export const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// For backwards compatibility during build
export const supabaseAdmin = {
  from: (table: string) => {
    const admin = getSupabaseAdmin()
    return admin.from(table)
  }
}

// Helper functions for getting user, document, and purchase info
export async function getUserInfo(userId: string) {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, phone, telegram_username, telegram_chat_id, notify_email_enabled, notify_telegram_enabled, notify_policy')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('getUserInfo error:', error)
      return null
    }

    return data
  } catch (error) {
    console.warn('getUserInfo error:', error)
    return null
  }
}

export async function getDocumentInfo(documentId: string) {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, description')
      .eq('id', documentId)
      .maybeSingle()

    if (error) {
      console.warn('getDocumentInfo error:', error)
      return null
    }

    return data
  } catch (error) {
    console.warn('getDocumentInfo error:', error)
    return null
  }
}

export async function getPurchaseInfo(purchaseId: string) {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('purchases')
      .select('id, product_name, amount_paid, currency, user_email')
      .eq('id', purchaseId)
      .maybeSingle()

    if (error) {
      console.warn('getPurchaseInfo error:', error)
      return null
    }

    return data
  } catch (error) {
    console.warn('getPurchaseInfo error:', error)
    return null
  }
}
