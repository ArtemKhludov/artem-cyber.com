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

// Workbook interface for multiple workbooks per course
export interface Workbook {
  id: string
  title: string
  description?: string
  file_url: string
  video_url?: string  // URL видео-объяснения для воркбука
  order_index: number
  is_active: boolean
}

// Интерфейс для видео курса
export interface CourseVideo {
  id: string
  document_id: string
  title: string
  description?: string
  file_url: string
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Интерфейс для аудио курса
export interface CourseAudio {
  id: string
  document_id: string
  title: string
  description?: string
  file_url: string
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
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
  workbook_url?: string // DEPRECATED: используйте workbooks array
  workbooks?: Workbook[] // Новое поле для множественных рабочих тетрадей
  video_urls?: string[] // DEPRECATED: используйте videos array
  videos?: CourseVideo[] // Новое поле для множественных видео
  audio_url?: string // DEPRECATED: используйте audio array
  audio?: CourseAudio[] // Новое поле для множественных аудио
  video_preview_url?: string
  course_duration_minutes?: number
  video_count?: number
  audio_count?: number // Количество аудио файлов
  has_workbook?: boolean
  has_audio?: boolean
  has_videos?: boolean
  workbook_count?: number // Количество рабочих тетрадей

  // Новые поля для предпросмотра курса
  main_pdf_title?: string // Название главного PDF
  main_pdf_description?: string // Описание главного PDF
  course_description?: string // Общее описание курса
  
  // Поля для курс-плеера
  purchase_date?: string // Дата покупки курса
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
