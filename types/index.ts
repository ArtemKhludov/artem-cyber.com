export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  stripe_payment_intent_id: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  pdf_url?: string
  session_id?: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  order_id: string
  daily_room_name: string
  daily_room_url: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  scheduled_at: string
  started_at?: string
  ended_at?: string
  created_at: string
  updated_at: string
}

export interface BookingSlot {
  id: string
  datetime: string
  duration: number
  timezone: string
  available: boolean
}

export interface StripePaymentIntent {
  id: string
  amount: number
  currency: string
  status: string
}

export interface DailyRoom {
  id: string
  name: string
  api_created: boolean
  privacy: string
  url: string
  created_at: string
  config: {
    max_participants?: number
    enable_screenshare?: boolean
    enable_chat?: boolean
    start_video_off?: boolean
    start_audio_off?: boolean
  }
}

// Document types for PDF preview and mini-courses
export interface Document {
  id: string
  title: string
  description: string
  price_rub: number
  file_url: string
  cover_url: string
  created_at: string
  updated_at: string
  // Новые поля для мини-курсов
  course_type?: 'pdf' | 'mini_course'
  workbook_url?: string
  video_urls?: string[]
  audio_url?: string
  video_preview_url?: string
  course_duration_minutes?: number
  video_count?: number
  has_workbook?: boolean
  has_audio?: boolean
  has_videos?: boolean
}

// Purchase types for payment tracking
export interface Purchase {
  id: string
  user_email?: string
  document_id: string
  payment_method: 'stripe' | 'cryptomus'
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  stripe_payment_intent_id?: string
  cryptomus_order_id?: string
  amount_paid: number
  currency: string
  user_country?: string
  user_ip?: string
  created_at: string
  updated_at: string
}

// Database types
export interface Database {
  public: {
    Tables: {
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      purchases: {
        Row: Purchase
        Insert: Omit<Purchase, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Purchase, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      profiles: {
        Row: User
        Insert: Omit<User, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
    }
  }
}
