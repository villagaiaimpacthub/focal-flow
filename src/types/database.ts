export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface UserPreferences {
  anchor_position: number
  default_speed: number
  theme: 'dark' | 'light'
  font_size: number
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          preferences: UserPreferences
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          preferences?: UserPreferences
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          preferences?: UserPreferences
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          file_path: string | null
          word_count: number
          words: string[]
          created_at: string
          last_read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_path?: string | null
          word_count?: number
          words?: string[]
          created_at?: string
          last_read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_path?: string | null
          word_count?: number
          words?: string[]
          created_at?: string
          last_read_at?: string | null
        }
      }
      reading_progress: {
        Row: {
          id: string
          user_id: string
          document_id: string
          word_index: number
          speed: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          word_index?: number
          speed?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          word_index?: number
          speed?: number
          updated_at?: string
        }
      }
      reading_sessions: {
        Row: {
          id: string
          user_id: string
          document_id: string
          start_index: number
          end_index: number
          speed: number
          duration_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          start_index: number
          end_index: number
          speed: number
          duration_seconds: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          start_index?: number
          end_index?: number
          speed?: number
          duration_seconds?: number
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          provider: 'anthropic' | 'mistral'
          encrypted_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'anthropic' | 'mistral'
          encrypted_key: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: 'anthropic' | 'openai'
          encrypted_key?: string
          created_at?: string
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type ReadingProgress = Database['public']['Tables']['reading_progress']['Row']
export type ReadingSession = Database['public']['Tables']['reading_sessions']['Row']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
