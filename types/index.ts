export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

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
  stripe_payment_intent_id?: string
  cryptomus_order_id?: string
  amount: number
  amount_paid: number
  status: 'pending' | 'completed' | 'failed'
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method: 'stripe' | 'cryptomus'
  currency: string
  user_email?: string
  user_country?: string
  user_ip?: string
  metadata?: Record<string, unknown>
  pdf_url?: string
  session_id?: string
  session_date?: string | null
  session_time?: string | null
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
  user_id?: string
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
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserCourseAccess {
  id: string
  user_id: string
  document_id: string
  granted_at: string
  expires_at?: string | null
  granted_by?: string | null
  source?: string | null
  metadata: Record<string, unknown>
  revoked_at?: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id?: string | null
  actor_email?: string | null
  action: string
  target_table?: string | null
  target_id?: string | null
  metadata: Record<string, unknown>
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
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
      user_course_access: {
        Row: UserCourseAccess
        Insert: Omit<UserCourseAccess, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<UserCourseAccess, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>
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
    Functions: {
      grant_course_access: {
        Args: {
          p_user_id: string
          p_document_id: string
          p_source?: string | null
          p_actor_id?: string | null
          p_actor_email?: string | null
          p_metadata?: Json
        }
        Returns: Array<{
          access_id: string | null
          user_id: string
          document_id: string
          action: string
        }>
      }
      revoke_course_access: {
        Args: {
          p_user_id: string
          p_document_id: string
          p_source?: string | null
          p_actor_id?: string | null
          p_actor_email?: string | null
          p_reason?: string | null
          p_metadata?: Json
        }
        Returns: Array<{
          access_id: string | null
          user_id: string
          document_id: string
          action: string
        }>
      }
      grant_course_access_from_purchase: {
        Args: {
          p_purchase_id: string
          p_actor_id?: string | null
          p_actor_email?: string | null
          p_source?: string | null
          p_metadata?: Json
        }
        Returns: Array<{
          access_id: string | null
          user_id: string
          document_id: string
          action: string
        }>
      }
      revoke_course_access_from_purchase: {
        Args: {
          p_purchase_id: string
          p_actor_id?: string | null
          p_actor_email?: string | null
          p_source?: string | null
          p_reason?: string | null
          p_metadata?: Json
        }
        Returns: Array<{
          access_id: string | null
          user_id: string
          document_id: string
          action: string
        }>
      }
    }
  }
}
